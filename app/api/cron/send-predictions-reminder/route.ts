import { NextResponse } from "next/server";
import { Resend } from "resend";

// Use Node.js runtime for Resend and database operations
export const runtime = "nodejs";
import { db } from "@/db";
import {
  users,
  quiniela_participants,
  quinielas,
  predictions,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  fetchRoundFixtures,
  getActiveRound,
} from "@/lib/api-football/fetchRoundFixtures";
import { FixtureData } from "@/types/fixtures";

const resend = new Resend(process.env.RESEND_API_KEY);

interface MissingPrediction {
  quinielaName: string;
  quinielaId: string;
  fixture: FixtureData;
}

// Brand colors (converted from oklch to hex for email compatibility)
const BRAND_PRIMARY = "#2563eb"; // blue-600, matches oklch(0.59 0.14 242)
const BRAND_PRIMARY_DARK = "#1d4ed8"; // blue-700 for gradients

// Generate HTML email for missing predictions
function generateEmailHtml(
  userName: string,
  missingPredictions: MissingPrediction[],
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  // Use EMAIL_LOGO_URL env var if set, otherwise construct from app URL
  // For emails to work, this MUST be a publicly accessible URL (not localhost)
  const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/img/logo.png`;

  // Group predictions by quiniela
  const groupedByQuiniela = missingPredictions.reduce(
    (acc, mp) => {
      if (!acc[mp.quinielaId]) {
        acc[mp.quinielaId] = {
          name: mp.quinielaName,
          fixtures: [],
        };
      }
      acc[mp.quinielaId].fixtures.push(mp.fixture);
      return acc;
    },
    {} as Record<string, { name: string; fixtures: FixtureData[] }>,
  );

  const quinielaBlocks = Object.entries(groupedByQuiniela)
    .map(([quinielaId, { name, fixtures }]) => {
      const fixtureRows = fixtures
        .map((fixture) => {
          const matchTime = new Date(fixture.fixture.date).toLocaleTimeString(
            "es-MX",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
          );

          return `
          <tr>
            <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="40%" style="text-align: right; padding-right: 12px;">
                    <table cellpadding="0" cellspacing="0" border="0" align="right">
                      <tr>
                        <td style="text-align: right; padding-right: 8px;">
                          <span style="font-size: 14px; font-weight: 500; color: #1f2937;">${fixture.teams.home.name}</span>
                        </td>
                        <td>
                          <img src="${fixture.teams.home.logo}" alt="${fixture.teams.home.name}" width="32" height="32" style="border-radius: 4px; background-color: white; padding: 2px;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="20%" style="text-align: center;">
                    <span style="display: inline-block; background-color: #f3f4f6; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; color: #6b7280;">${matchTime}</span>
                  </td>
                  <td width="40%" style="text-align: left; padding-left: 12px;">
                    <table cellpadding="0" cellspacing="0" border="0" align="left">
                      <tr>
                        <td>
                          <img src="${fixture.teams.away.logo}" alt="${fixture.teams.away.name}" width="32" height="32" style="border-radius: 4px; background-color: white; padding: 2px;" />
                        </td>
                        <td style="text-align: left; padding-left: 8px;">
                          <span style="font-size: 14px; font-weight: 500; color: #1f2937;">${fixture.teams.away.name}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
        })
        .join("");

      return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_PRIMARY_DARK} 100%); padding: 16px 20px; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 600; color: white;">${name}</span>
                    <br />
                    <span style="font-size: 13px; color: rgba(255,255,255,0.8);">${fixtures.length} partido${fixtures.length > 1 ? "s" : ""} pendiente${fixtures.length > 1 ? "s" : ""}</span>
                  </td>
                  <td style="text-align: right;">
                    <a href="${appUrl}/quinielas/${quinielaId}/registrar-pronosticos" style="display: inline-block; background-color: white; color: ${BRAND_PRIMARY}; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                      Registrar →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; overflow: hidden;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${fixtureRows}
              </table>
            </td>
          </tr>
        </table>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recordatorio de Pronósticos</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
              <!-- Header -->
              <tr>
                <td style="text-align: center; padding-bottom: 32px;">
                  <img src="${logoUrl}" alt="Quiniela Turbo" width="80" height="80" style="margin-bottom: 16px; border-radius: 16px;" />
                  <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1f2937;">
                    ¡Tienes pronósticos pendientes!
                  </h1>
                  <p style="margin: 0; font-size: 16px; color: #6b7280;">
                    Hola <strong>${userName}</strong>, no olvides registrar tus pronósticos
                  </p>
                </td>
              </tr>

              <!-- Alert Banner -->
              <tr>
                <td style="padding-bottom: 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #dbeafe; border: 1px solid ${BRAND_PRIMARY}40; border-radius: 12px; padding: 16px 20px;">
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="padding-right: 12px; vertical-align: top;">
                              <span style="font-size: 20px;">⏰</span>
                            </td>
                            <td>
                              <span style="font-size: 14px; font-weight: 600; color: ${BRAND_PRIMARY_DARK};">Recordatorio importante</span>
                              <br />
                              <span style="font-size: 13px; color: #1e40af;">Tienes <strong>${missingPredictions.length} pronóstico${missingPredictions.length > 1 ? "s" : ""}</strong> pendiente${missingPredictions.length > 1 ? "s" : ""} para la jornada actual. ¡Regístralos antes de que comiencen los partidos!</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Quiniela Blocks -->
              <tr>
                <td>
                  ${quinielaBlocks}
                </td>
              </tr>

              <!-- CTA Button -->
              <tr>
                <td style="text-align: center; padding: 24px 0;">
                  <a href="${appUrl}/quinielas" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_PRIMARY_DARK} 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                    Ver todas mis quinielas
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="text-align: center; padding-top: 32px; border-top: 1px solid #e5e7eb;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="text-align: center;">
                        <img src="${logoUrl}" alt="Quiniela Turbo" width="32" height="32" style="margin-bottom: 8px; border-radius: 6px;" />
                        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: ${BRAND_PRIMARY};">
                          Quiniela Turbo
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                          Este correo fue enviado automáticamente
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function GET(request: Request) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting predictions reminder cron job...");

    // Get all users
    const allUsers = await db.select().from(users);

    let emailsSent = 0;
    let usersProcessed = 0;

    for (const user of allUsers) {
      if (!user.email) {
        console.log(`Skipping user ${user.id} - no email`);
        continue;
      }

      usersProcessed++;

      // Get all quinielas this user participates in
      const userParticipations = await db
        .select({
          quinielaId: quiniela_participants.quinielaId,
          quinielaName: quinielas.name,
          externalLeagueId: quinielas.externalLeagueId,
          externalSeason: quinielas.externalSeason,
          roundsSelected: quinielas.roundsSelected,
        })
        .from(quiniela_participants)
        .innerJoin(
          quinielas,
          eq(quiniela_participants.quinielaId, quinielas.id),
        )
        .where(eq(quiniela_participants.userId, user.id));

      if (userParticipations.length === 0) {
        console.log(`User ${user.email} has no quinielas`);
        continue;
      }

      const missingPredictions: MissingPrediction[] = [];

      // Process each quiniela
      for (const participation of userParticipations) {
        // Get the active/next round for this quiniela
        const activeRound = getActiveRound(participation.roundsSelected || []);

        if (!activeRound) {
          console.log(
            `No active round found for quiniela ${participation.quinielaName}`,
          );
          continue;
        }

        console.log(
          `Active round for ${participation.quinielaName}: ${activeRound.roundName}`,
        );

        // Fetch fixtures for the active round
        const roundFixtures = await fetchRoundFixtures(
          participation.externalLeagueId,
          participation.externalSeason,
          activeRound.roundName,
        );

        if (roundFixtures.length === 0) {
          console.log(
            `No fixtures in round "${activeRound.roundName}" for quiniela ${participation.quinielaName}`,
          );
          continue;
        }

        // Get fixture IDs
        const fixtureIds = roundFixtures.map((f) => f.fixture.id.toString());

        // Get user's existing predictions for these fixtures
        const existingPredictions = await db
          .select()
          .from(predictions)
          .where(
            and(
              eq(predictions.userId, user.id),
              eq(predictions.quinielaId, participation.quinielaId),
              inArray(predictions.externalFixtureId, fixtureIds),
            ),
          );

        const predictedFixtureIds = new Set(
          existingPredictions.map((p) => p.externalFixtureId),
        );

        // Find fixtures without predictions (only those that haven't started yet)
        for (const fixture of roundFixtures) {
          const fixtureId = fixture.fixture.id.toString();
          if (!predictedFixtureIds.has(fixtureId)) {
            // Only add if match hasn't started yet
            const matchDate = new Date(fixture.fixture.date);
            if (matchDate > new Date()) {
              missingPredictions.push({
                quinielaName: participation.quinielaName,
                quinielaId: participation.quinielaId,
                fixture,
              });
            }
          }
        }
      }

      // Send email if there are missing predictions
      if (missingPredictions.length > 0) {
        console.log(
          `Sending reminder to ${user.email} for ${missingPredictions.length} missing predictions`,
        );

        const emailHtml = generateEmailHtml(
          user.name || "Usuario",
          missingPredictions,
        );

        await resend.emails.send({
          from: "Onboarding <onboarding@resend.dev>",
          to: user.email,
          subject: `⚽ Tienes ${missingPredictions.length} pronóstico${missingPredictions.length > 1 ? "s" : ""} pendiente${missingPredictions.length > 1 ? "s" : ""}`,
          html: emailHtml,
        });

        emailsSent++;
      } else {
        console.log(
          `User ${user.email} has no missing predictions for the current round`,
        );
      }
    }

    console.log(
      `Cron job completed. Processed ${usersProcessed} users, sent ${emailsSent} emails.`,
    );

    return NextResponse.json({
      success: true,
      usersProcessed,
      emailsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in predictions reminder cron job:", error);
    return NextResponse.json(
      {
        error: "Failed to process predictions reminder",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

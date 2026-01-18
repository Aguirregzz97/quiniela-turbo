import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

import { db } from "@/db";
import {
  users,
  survivor_game_participants,
  survivor_games,
  survivor_game_picks,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  fetchRoundFixtures,
  getActiveRound,
} from "@/lib/api-football/fetchRoundFixtures";
import { FixtureData } from "@/types/fixtures";
import { calculateSurvivorStatus } from "@/lib/survivor/calculateSurvivorStatus";

const resend = new Resend(process.env.RESEND_API_KEY);

interface MissingSurvivorPick {
  survivorName: string;
  survivorId: string;
  roundName: string;
  firstMatchDate: Date;
  fixtures: FixtureData[];
}

// Brand colors
const BRAND_PRIMARY = "#2563eb";
const BRAND_PRIMARY_DARK = "#1d4ed8";
const SURVIVOR_COLOR = "#f59e0b"; // amber-500 for survivor theme
const SURVIVOR_COLOR_DARK = "#d97706"; // amber-600

// Generate HTML email for missing survivor picks
function generateSurvivorEmailHtml(
  userName: string,
  missingSurvivorPicks: MissingSurvivorPick[],
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/img/logo.png`;

  const survivorBlocks = missingSurvivorPicks
    .map(
      ({ survivorId, survivorName, roundName, firstMatchDate, fixtures }) => {
        // Format first match date
        const formattedDate = firstMatchDate.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "America/Mexico_City",
        });
        const formattedTime = firstMatchDate.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/Mexico_City",
        });

        // Show first 3 fixtures as examples
        const fixtureExamples = fixtures
          .slice(0, 3)
          .map(
            (f) => `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="text-align: center;">
                    <img src="${f.teams.home.logo}" alt="${f.teams.home.name}" width="24" height="24" style="vertical-align: middle; margin-right: 8px;" />
                    <span style="font-size: 13px; color: #374151;">${f.teams.home.name}</span>
                    <span style="font-size: 12px; color: #9ca3af; margin: 0 8px;">vs</span>
                    <span style="font-size: 13px; color: #374151;">${f.teams.away.name}</span>
                    <img src="${f.teams.away.logo}" alt="${f.teams.away.name}" width="24" height="24" style="vertical-align: middle; margin-left: 8px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `,
          )
          .join("");

        const moreFixtures =
          fixtures.length > 3
            ? `<tr><td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #6b7280;">+${fixtures.length - 3} partidos más</td></tr>`
            : "";

        return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="background: linear-gradient(135deg, ${SURVIVOR_COLOR} 0%, ${SURVIVOR_COLOR_DARK} 100%); padding: 16px 20px; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 600; color: white;">⚔️ ${survivorName}</span>
                    <br />
                    <span style="font-size: 13px; color: rgba(255,255,255,0.9);">${roundName}</span>
                  </td>
                  <td style="text-align: right;">
                    <a href="${appUrl}/survivor/${survivorId}/seleccionar-equipo" style="display: inline-block; background-color: white; color: ${SURVIVOR_COLOR_DARK}; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                      Elegir equipo →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fffbeb; border: 1px solid ${SURVIVOR_COLOR}40; border-top: none; padding: 12px 16px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right: 8px; vertical-align: top;">
                    <span style="font-size: 16px;">⏰</span>
                  </td>
                  <td>
                    <span style="font-size: 13px; color: ${SURVIVOR_COLOR_DARK}; font-weight: 500;">
                      La jornada comienza el ${formattedDate} a las ${formattedTime}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; overflow: hidden;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Partidos disponibles</span>
                  </td>
                </tr>
                ${fixtureExamples}
                ${moreFixtures}
              </table>
            </td>
          </tr>
        </table>
      `;
      },
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recordatorio de Survivor</title>
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
                    ⚔️ ¡Elige tu equipo en Survivor!
                  </h1>
                  <p style="margin: 0; font-size: 16px; color: #6b7280;">
                    Hola <strong>${userName}</strong>, no olvides hacer tu selección
                  </p>
                </td>
              </tr>

              <!-- Alert Banner -->
              <tr>
                <td style="padding-bottom: 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border: 1px solid ${SURVIVOR_COLOR}40; border-radius: 12px; padding: 16px 20px;">
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="padding-right: 12px; vertical-align: top;">
                              <span style="font-size: 20px;">🎯</span>
                            </td>
                            <td>
                              <span style="font-size: 14px; font-weight: 600; color: ${SURVIVOR_COLOR_DARK};">Recordatorio importante</span>
                              <br />
                              <span style="font-size: 13px; color: #92400e;">Tienes <strong>${missingSurvivorPicks.length} Survivor${missingSurvivorPicks.length > 1 ? "s" : ""}</strong> donde aún no has elegido equipo para la próxima jornada. ¡Selecciona antes de que comiencen los partidos!</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Survivor Blocks -->
              <tr>
                <td>
                  ${survivorBlocks}
                </td>
              </tr>

              <!-- CTA Button -->
              <tr>
                <td style="text-align: center; padding: 24px 0;">
                  <a href="${appUrl}/survivor" style="display: inline-block; background: linear-gradient(135deg, ${SURVIVOR_COLOR} 0%, ${SURVIVOR_COLOR_DARK} 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                    Ver mis Survivors
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
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      "[Survivor Reminder] Starting survivor pick reminder cron job...",
    );

    // Get all users
    const allUsers = await db.select().from(users);

    let emailsSent = 0;
    let usersProcessed = 0;

    // Optional: Only send emails to a specific address for testing
    const onlySendEmailsTo = process.env.ONLY_SEND_EMAILS_TO;
    if (onlySendEmailsTo) {
      console.log(
        `[Survivor Reminder] ONLY_SEND_EMAILS_TO is set, will only send emails to: ${onlySendEmailsTo}`,
      );
    }

    for (const user of allUsers) {
      if (!user.email) {
        console.log(`[Survivor Reminder] Skipping user ${user.id} - no email`);
        continue;
      }

      // Skip users that don't match the test email filter
      if (onlySendEmailsTo && user.email !== onlySendEmailsTo) {
        continue;
      }

      usersProcessed++;

      // Get all survivor games this user participates in
      const userParticipations = await db
        .select({
          survivorId: survivor_game_participants.survivorGameId,
          participantId: survivor_game_participants.id,
          survivorName: survivor_games.name,
          externalLeagueId: survivor_games.externalLeagueId,
          externalSeason: survivor_games.externalSeason,
          roundsSelected: survivor_games.roundsSelected,
          lives: survivor_games.lives,
        })
        .from(survivor_game_participants)
        .innerJoin(
          survivor_games,
          eq(survivor_game_participants.survivorGameId, survivor_games.id),
        )
        .where(eq(survivor_game_participants.userId, user.id));

      if (userParticipations.length === 0) {
        console.log(
          `[Survivor Reminder] User ${user.email} has no survivor games`,
        );
        continue;
      }

      const missingSurvivorPicks: MissingSurvivorPick[] = [];

      // Process each survivor game
      for (const participation of userParticipations) {
        // Get user's picks for this game to calculate status
        const userPicks = await db
          .select({
            id: survivor_game_picks.id,
            externalFixtureId: survivor_game_picks.externalFixtureId,
            externalRound: survivor_game_picks.externalRound,
            externalPickedTeamId: survivor_game_picks.externalPickedTeamId,
            externalPickedTeamName: survivor_game_picks.externalPickedTeamName,
          })
          .from(survivor_game_picks)
          .where(
            and(
              eq(survivor_game_picks.survivorGameId, participation.survivorId),
              eq(survivor_game_picks.userId, user.id),
            ),
          );

        // Calculate if user is eliminated
        const status = await calculateSurvivorStatus(
          userPicks,
          participation.roundsSelected || [],
          participation.lives,
          participation.externalLeagueId,
          participation.externalSeason,
        );

        // Skip if user is eliminated
        if (status.isEliminated) {
          console.log(
            `[Survivor Reminder] User ${user.email} is eliminated from ${participation.survivorName}`,
          );
          continue;
        }

        // Get the active/next round for this survivor
        const activeRound = getActiveRound(participation.roundsSelected || []);

        if (!activeRound) {
          console.log(
            `[Survivor Reminder] No active round found for survivor ${participation.survivorName}`,
          );
          continue;
        }

        console.log(
          `[Survivor Reminder] Active round for ${participation.survivorName}: ${activeRound.roundName}`,
        );

        // Check if user already has a pick for this round
        const existingPick = await db
          .select()
          .from(survivor_game_picks)
          .where(
            and(
              eq(survivor_game_picks.survivorGameId, participation.survivorId),
              eq(survivor_game_picks.userId, user.id),
              eq(survivor_game_picks.externalRound, activeRound.roundName),
            ),
          )
          .limit(1);

        if (existingPick.length > 0) {
          console.log(
            `[Survivor Reminder] User ${user.email} already has a pick for ${participation.survivorName} round ${activeRound.roundName}`,
          );
          continue;
        }

        // Fetch fixtures for the active round
        const roundFixtures = await fetchRoundFixtures(
          participation.externalLeagueId,
          participation.externalSeason,
          activeRound.roundName,
        );

        if (roundFixtures.length === 0) {
          console.log(
            `[Survivor Reminder] No fixtures in round "${activeRound.roundName}" for survivor ${participation.survivorName}`,
          );
          continue;
        }

        // Check if any match has already started
        const now = new Date();
        const upcomingFixtures = roundFixtures.filter((f) => {
          const matchDate = new Date(f.fixture.date);
          return matchDate > now && f.fixture.status.short === "NS";
        });

        if (upcomingFixtures.length === 0) {
          console.log(
            `[Survivor Reminder] All matches have started for ${participation.survivorName} round ${activeRound.roundName}`,
          );
          continue;
        }

        // Get first match date
        const sortedFixtures = [...roundFixtures].sort(
          (a, b) =>
            new Date(a.fixture.date).getTime() -
            new Date(b.fixture.date).getTime(),
        );
        const firstMatchDate = new Date(sortedFixtures[0].fixture.date);

        missingSurvivorPicks.push({
          survivorName: participation.survivorName,
          survivorId: participation.survivorId,
          roundName: activeRound.roundName,
          firstMatchDate,
          fixtures: roundFixtures,
        });
      }

      // Send email if there are missing picks
      if (missingSurvivorPicks.length > 0) {
        console.log(
          `[Survivor Reminder] Sending reminder to ${user.email} for ${missingSurvivorPicks.length} survivor games`,
        );

        const emailHtml = generateSurvivorEmailHtml(
          user.name || "Usuario",
          missingSurvivorPicks,
        );

        try {
          const result = await resend.emails.send({
            from: "Quiniela Turbo <noreply@quinielaturbo.com>",
            to: user.email,
            subject: `⚔️ Elige tu equipo en ${missingSurvivorPicks.length} Survivor${missingSurvivorPicks.length > 1 ? "s" : ""}`,
            html: emailHtml,
            replyTo: "quinielaturbo1@gmail.com",
          });

          if (result.error) {
            console.error(
              `[Survivor Reminder] Failed to send email to ${user.email}:`,
              result.error,
            );
          } else {
            console.log(
              `[Survivor Reminder] Email sent successfully to ${user.email}, id: ${result.data?.id}`,
            );
            emailsSent++;
          }
        } catch (emailError) {
          console.error(
            `[Survivor Reminder] Error sending email to ${user.email}:`,
            emailError,
          );
        }
      } else {
        console.log(
          `[Survivor Reminder] User ${user.email} has picks for all active survivor rounds`,
        );
      }
    }

    console.log(
      `[Survivor Reminder] Cron job completed. Processed ${usersProcessed} users, sent ${emailsSent} emails.`,
    );

    return NextResponse.json({
      success: true,
      usersProcessed,
      emailsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[Survivor Reminder] Error in survivor reminder cron job:",
      error,
    );
    return NextResponse.json(
      {
        error: "Failed to process survivor reminder",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}


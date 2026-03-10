import { db } from "@/db";
import {
  quiniela_participants,
  quinielas,
  predictions,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { fetchRoundFixtures } from "@/lib/api-football/fetchRoundFixtures";
import { getActiveRound } from "@/lib/rounds";
import { FixtureData } from "@/types/fixtures";

// ──────────────────── Types ────────────────────

export interface MissingPrediction {
  quinielaName: string;
  quinielaId: string;
  fixture: FixtureData;
}

export interface CompletedPrediction {
  quinielaName: string;
  quinielaId: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  predictedHome: number | null;
  predictedAway: number | null;
}

export interface SkippedFixture {
  quinielaName: string;
  quinielaId: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  reason: string;
}

export interface UserPredictionAnalysis {
  quinielasCount: number;
  missingPredictions: MissingPrediction[];
  completedPredictions: CompletedPrediction[];
  skippedFixtures: SkippedFixture[];
}

// ──────────────────── Core analysis ────────────────────

/**
 * Analyzes a single user's missing predictions across all their quinielas.
 * Returns categorized fixtures: missing, completed, and skipped.
 *
 * @param userId          - The user to analyze
 * @param skipDateCheck   - If true, include started matches as "missing" (for testing)
 */
export async function analyzeUserPredictions(
  userId: string,
  skipDateCheck = false,
): Promise<UserPredictionAnalysis> {
  const result: UserPredictionAnalysis = {
    quinielasCount: 0,
    missingPredictions: [],
    completedPredictions: [],
    skippedFixtures: [],
  };

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
    .where(eq(quiniela_participants.userId, userId));

  result.quinielasCount = userParticipations.length;
  if (userParticipations.length === 0) return result;

  for (const participation of userParticipations) {
    const activeRound = getActiveRound(participation.roundsSelected || []);
    if (!activeRound) continue;

    // Fetch fixtures for the active round
    const roundFixtures = await fetchRoundFixtures(
      participation.externalLeagueId,
      participation.externalSeason,
      activeRound.roundName,
    );
    if (roundFixtures.length === 0) continue;

    // Get fixture IDs
    const fixtureIds = roundFixtures.map((f) => f.fixture.id.toString());

    // Get user's existing predictions for these fixtures
    const existingPredictions = await db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.userId, userId),
          eq(predictions.quinielaId, participation.quinielaId),
          inArray(predictions.externalFixtureId, fixtureIds),
        ),
      );

    // Map predictions by fixture ID
    const predictionsByFixture = new Map(
      existingPredictions.map((p) => [p.externalFixtureId, p]),
    );

    const now = new Date();

    for (const fixture of roundFixtures) {
      const fixtureId = fixture.fixture.id.toString();
      const matchDate = new Date(fixture.fixture.date);
      const prediction = predictionsByFixture.get(fixtureId);

      const fixtureInfo = {
        quinielaName: participation.quinielaName,
        quinielaId: participation.quinielaId,
        fixtureId,
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
      };

      // Match already started / finished
      if (matchDate <= now && !skipDateCheck) {
        result.skippedFixtures.push({
          ...fixtureInfo,
          reason: `Match already started/finished (${fixture.fixture.status.short})`,
        });
        continue;
      }

      // Prediction exists with actual values
      if (
        prediction &&
        prediction.predictedHomeScore !== null &&
        prediction.predictedAwayScore !== null
      ) {
        result.completedPredictions.push({
          ...fixtureInfo,
          predictedHome: prediction.predictedHomeScore,
          predictedAway: prediction.predictedAwayScore,
        });
      } else {
        // Missing prediction
        result.missingPredictions.push({
          quinielaName: participation.quinielaName,
          quinielaId: participation.quinielaId,
          fixture,
        });
      }
    }
  }

  return result;
}

// ──────────────────── Email HTML ────────────────────

// Brand colors (converted from oklch to hex for email compatibility)
const BRAND_PRIMARY = "#2563eb";
const BRAND_PRIMARY_DARK = "#1d4ed8";

export function generatePredictionsEmailHtml(
  userName: string,
  missingPredictions: MissingPrediction[],
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
          const matchDate = new Date(fixture.fixture.date);
          const formattedDate = matchDate.toLocaleDateString("es-MX", {
            weekday: "short",
            day: "numeric",
            month: "short",
            timeZone: "America/Mexico_City",
          });
          const formattedTime = matchDate.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "America/Mexico_City",
          });

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
                    <div style="display: inline-block; background-color: #f3f4f6; padding: 8px 12px; border-radius: 8px;">
                      <span style="display: block; font-size: 11px; color: #9ca3af; margin-bottom: 2px;">${formattedDate}</span>
                      <span style="display: block; font-size: 14px; font-weight: 600; color: #6b7280;">${formattedTime}</span>
                    </div>
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


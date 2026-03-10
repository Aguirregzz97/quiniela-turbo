import { db } from "@/db";
import {
  survivor_game_participants,
  survivor_games,
  survivor_game_picks,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchRoundFixtures } from "@/lib/api-football/fetchRoundFixtures";
import { getActiveRound } from "@/lib/rounds";
import { FixtureData } from "@/types/fixtures";
import { calculateSurvivorStatus } from "@/lib/survivor/calculateSurvivorStatus";

// ──────────────────── Types ────────────────────

export interface MissingSurvivorPick {
  survivorName: string;
  survivorId: string;
  roundName: string;
  firstMatchDate: Date;
  fixtures: FixtureData[];
}

export interface SurvivorGameDetail {
  survivorName: string;
  survivorId: string;
  leagueId: string;
  season: string;
  totalLives: number;
  livesRemaining: number;
  isEliminated: boolean;
  eliminatedAtRound: string | null;
  activeRound: string | null;
  hasPickForActiveRound: boolean;
  activeRoundPickedTeam: string | null;
  allPicks: { round: string; teamPicked: string; fixtureId: string }[];
  needsReminder: boolean;
}

export interface UserSurvivorAnalysis {
  missingSurvivorPicks: MissingSurvivorPick[];
  gameDetails: SurvivorGameDetail[];
}

// ──────────────────── Core analysis ────────────────────

/**
 * Analyzes a single user's survivor games — determines which games
 * need a pick reminder and returns detailed per-game status.
 */
export async function analyzeUserSurvivorPicks(
  userId: string,
): Promise<UserSurvivorAnalysis> {
  const result: UserSurvivorAnalysis = {
    missingSurvivorPicks: [],
    gameDetails: [],
  };

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
    .where(eq(survivor_game_participants.userId, userId));

  if (userParticipations.length === 0) return result;

  for (const participation of userParticipations) {
    // Get user's picks for this game
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
          eq(survivor_game_picks.userId, userId),
        ),
      );

    // Calculate elimination status
    const status = await calculateSurvivorStatus(
      userPicks,
      participation.roundsSelected || [],
      participation.lives,
      participation.externalLeagueId,
      participation.externalSeason,
    );

    // Get active round
    const activeRound = getActiveRound(participation.roundsSelected || []);

    // Check if user has a pick for the active round
    const existingPick = activeRound
      ? userPicks.find((p) => p.externalRound === activeRound.roundName)
      : null;

    const needsReminder =
      !status.isEliminated && !!activeRound && !existingPick;

    // Build game detail (always — used by debug)
    const gameDetail: SurvivorGameDetail = {
      survivorName: participation.survivorName,
      survivorId: participation.survivorId,
      leagueId: participation.externalLeagueId,
      season: participation.externalSeason,
      totalLives: participation.lives,
      livesRemaining: status.livesRemaining,
      isEliminated: status.isEliminated,
      eliminatedAtRound: status.eliminatedAtRound,
      activeRound: activeRound?.roundName || null,
      hasPickForActiveRound: !!existingPick,
      activeRoundPickedTeam: existingPick?.externalPickedTeamName || null,
      allPicks: userPicks.map((pick) => ({
        round: pick.externalRound,
        teamPicked: pick.externalPickedTeamName,
        fixtureId: pick.externalFixtureId,
      })),
      needsReminder,
    };
    result.gameDetails.push(gameDetail);

    // Build the missing-pick data only when a reminder is actually needed
    if (!needsReminder || !activeRound) continue;

    // Fetch fixtures to verify there are upcoming matches
    const roundFixtures = await fetchRoundFixtures(
      participation.externalLeagueId,
      participation.externalSeason,
      activeRound.roundName,
    );
    if (roundFixtures.length === 0) continue;

    const now = new Date();
    const upcomingFixtures = roundFixtures.filter((f) => {
      const matchDate = new Date(f.fixture.date);
      return matchDate > now && f.fixture.status.short === "NS";
    });
    if (upcomingFixtures.length === 0) continue;

    // Get first match date for the email
    const sortedFixtures = [...roundFixtures].sort(
      (a, b) =>
        new Date(a.fixture.date).getTime() -
        new Date(b.fixture.date).getTime(),
    );

    result.missingSurvivorPicks.push({
      survivorName: participation.survivorName,
      survivorId: participation.survivorId,
      roundName: activeRound.roundName,
      firstMatchDate: new Date(sortedFixtures[0].fixture.date),
      fixtures: roundFixtures,
    });
  }

  return result;
}

// ──────────────────── Email HTML ────────────────────

const BRAND_PRIMARY = "#2563eb";
const SURVIVOR_COLOR = "#f59e0b";
const SURVIVOR_COLOR_DARK = "#d97706";

export function generateSurvivorEmailHtml(
  userName: string,
  missingSurvivorPicks: MissingSurvivorPick[],
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/img/logo.png`;

  const survivorBlocks = missingSurvivorPicks
    .map(
      ({ survivorId, survivorName, roundName, firstMatchDate, fixtures }) => {
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


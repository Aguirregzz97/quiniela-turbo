import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  survivor_games,
  survivor_game_participants,
  survivor_game_picks,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchRoundFixtures } from "@/lib/api-football/fetchRoundFixtures";
import { FixtureData } from "@/types/fixtures";

export const runtime = "nodejs";

// Check if a pick was successful (team won or drew)
function isPickSuccessful(
  fixture: FixtureData,
  pickedTeamId: string,
): { success: boolean; finished: boolean } {
  const status = fixture.fixture.status.short;

  // Match not finished yet
  if (!["FT", "AET", "PEN"].includes(status)) {
    return { success: false, finished: false };
  }

  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;
  const homeTeamId = fixture.teams.home.id.toString();
  const awayTeamId = fixture.teams.away.id.toString();

  // Draw - both teams survive
  if (homeGoals === awayGoals) {
    return { success: true, finished: true };
  }

  // Home team won
  if (homeGoals > awayGoals) {
    return { success: pickedTeamId === homeTeamId, finished: true };
  }

  // Away team won
  return { success: pickedTeamId === awayTeamId, finished: true };
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

    console.log("[Survivor] Starting survivor results processing...");

    // Get all active survivor games (games that have participants who are not eliminated)
    const activeSurvivorGames = await db
      .select({
        id: survivor_games.id,
        name: survivor_games.name,
        externalLeagueId: survivor_games.externalLeagueId,
        externalSeason: survivor_games.externalSeason,
        roundsSelected: survivor_games.roundsSelected,
        lives: survivor_games.lives,
      })
      .from(survivor_games);

    let gamesProcessed = 0;
    let participantsUpdated = 0;
    let eliminationsProcessed = 0;

    for (const game of activeSurvivorGames) {
      console.log(`[Survivor] Processing game: ${game.name}`);

      // Get all participants for this game
      const participants = await db
        .select()
        .from(survivor_game_participants)
        .where(eq(survivor_game_participants.survivorGameId, game.id));

      // Get all picks for this game
      const allPicks = await db
        .select()
        .from(survivor_game_picks)
        .where(eq(survivor_game_picks.survivorGameId, game.id));

      // Group picks by round to process
      const roundsWithPicks = [...new Set(allPicks.map((p) => p.externalRound))];

      for (const roundName of roundsWithPicks) {
        console.log(`[Survivor] Processing round: ${roundName}`);

        // Fetch fixtures for this round
        const fixtures = await fetchRoundFixtures(
          game.externalLeagueId,
          game.externalSeason,
          roundName,
        );

        // Create a map of fixture ID to fixture data
        const fixtureMap = new Map<string, FixtureData>();
        for (const fixture of fixtures) {
          fixtureMap.set(fixture.fixture.id.toString(), fixture);
        }

        // Get picks for this round
        const roundPicks = allPicks.filter((p) => p.externalRound === roundName);

        for (const pick of roundPicks) {
          const fixture = fixtureMap.get(pick.externalFixtureId);
          if (!fixture) {
            console.log(
              `[Survivor] Fixture ${pick.externalFixtureId} not found for pick`,
            );
            continue;
          }

          const result = isPickSuccessful(fixture, pick.externalPickedTeamId);

          // Skip if match not finished
          if (!result.finished) {
            continue;
          }

          // Find the participant
          const participant = participants.find(
            (p) => p.userId === pick.userId,
          );
          if (!participant) {
            console.log(`[Survivor] Participant not found for pick`);
            continue;
          }

          // Skip if already eliminated
          if (participant.isEliminated) {
            continue;
          }

          // If pick failed, reduce lives
          if (!result.success) {
            const newLives = participant.livesRemaining - 1;
            const isEliminated = newLives <= 0;

            console.log(
              `[Survivor] ${participant.userId} picked ${pick.externalPickedTeamName} - LOST. Lives: ${participant.livesRemaining} -> ${newLives}`,
            );

            await db
              .update(survivor_game_participants)
              .set({
                livesRemaining: newLives,
                isEliminated,
                eliminatedAtRound: isEliminated ? roundName : null,
                updatedAt: new Date(),
              })
              .where(eq(survivor_game_participants.id, participant.id));

            participantsUpdated++;
            if (isEliminated) {
              eliminationsProcessed++;
            }

            // Update local participant object to avoid re-processing
            participant.livesRemaining = newLives;
            participant.isEliminated = isEliminated;
          } else {
            console.log(
              `[Survivor] ${participant.userId} picked ${pick.externalPickedTeamName} - SURVIVED`,
            );
          }
        }
      }

      gamesProcessed++;
    }

    console.log(
      `[Survivor] Processing completed. Games: ${gamesProcessed}, Participants updated: ${participantsUpdated}, Eliminations: ${eliminationsProcessed}`,
    );

    return NextResponse.json({
      success: true,
      gamesProcessed,
      participantsUpdated,
      eliminationsProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Survivor] Error processing survivor results:", error);
    return NextResponse.json(
      {
        error: "Failed to process survivor results",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}


import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  survivor_games,
  survivor_game_participants,
  survivor_game_picks,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchRoundFixtures } from "@/lib/api-football/fetchRoundFixtures";
import { FixtureData } from "@/types/fixtures";

export const runtime = "nodejs";

// Check if a pick was successful (team won or drew)
function isPickSuccessful(
  fixture: FixtureData,
  pickedTeamId: string,
): { success: boolean; finished: boolean; reason: string } {
  const status = fixture.fixture.status.short;

  // Match not finished yet
  if (!["FT", "AET", "PEN"].includes(status)) {
    return { success: false, finished: false, reason: `Match status: ${status}` };
  }

  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;
  const homeTeamId = fixture.teams.home.id.toString();
  const awayTeamId = fixture.teams.away.id.toString();

  // Draw - both teams survive
  if (homeGoals === awayGoals) {
    return { success: true, finished: true, reason: `Draw ${homeGoals}-${awayGoals}` };
  }

  // Home team won
  if (homeGoals > awayGoals) {
    const success = pickedTeamId === homeTeamId;
    return {
      success,
      finished: true,
      reason: `Home won ${homeGoals}-${awayGoals}, picked ${success ? "winner" : "loser"}`,
    };
  }

  // Away team won
  const success = pickedTeamId === awayTeamId;
  return {
    success,
    finished: true,
    reason: `Away won ${homeGoals}-${awayGoals}, picked ${success ? "winner" : "loser"}`,
  };
}

// Debug endpoint - requires cron secret, doesn't modify data
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

    console.log("[Survivor Debug] Starting debug analysis...");

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

    const debugResults: {
      game: string;
      rounds: {
        round: string;
        picks: {
          participantId: string;
          pickedTeam: string;
          fixture: string;
          result: { success: boolean; finished: boolean; reason: string };
          currentLives: number;
          wouldBeEliminated: boolean;
        }[];
      }[];
    }[] = [];

    for (const game of activeSurvivorGames) {
      const gameResult = {
        game: game.name,
        rounds: [] as typeof debugResults[0]["rounds"],
      };

      const participants = await db
        .select()
        .from(survivor_game_participants)
        .where(eq(survivor_game_participants.survivorGameId, game.id));

      const allPicks = await db
        .select()
        .from(survivor_game_picks)
        .where(eq(survivor_game_picks.survivorGameId, game.id));

      const roundsWithPicks = [...new Set(allPicks.map((p) => p.externalRound))];

      for (const roundName of roundsWithPicks) {
        const roundResult = {
          round: roundName,
          picks: [] as typeof debugResults[0]["rounds"][0]["picks"],
        };

        const fixtures = await fetchRoundFixtures(
          game.externalLeagueId,
          game.externalSeason,
          roundName,
        );

        const fixtureMap = new Map<string, FixtureData>();
        for (const fixture of fixtures) {
          fixtureMap.set(fixture.fixture.id.toString(), fixture);
        }

        const roundPicks = allPicks.filter((p) => p.externalRound === roundName);

        for (const pick of roundPicks) {
          const fixture = fixtureMap.get(pick.externalFixtureId);
          const participant = participants.find((p) => p.userId === pick.userId);

          if (!fixture || !participant) continue;

          const result = isPickSuccessful(fixture, pick.externalPickedTeamId);
          const wouldLoseLife = result.finished && !result.success;
          const newLives = wouldLoseLife
            ? participant.livesRemaining - 1
            : participant.livesRemaining;

          roundResult.picks.push({
            participantId: pick.userId,
            pickedTeam: pick.externalPickedTeamName,
            fixture: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
            result,
            currentLives: participant.livesRemaining,
            wouldBeEliminated: wouldLoseLife && newLives <= 0,
          });
        }

        if (roundResult.picks.length > 0) {
          gameResult.rounds.push(roundResult);
        }
      }

      debugResults.push(gameResult);
    }

    return NextResponse.json({
      success: true,
      note: "This is a debug endpoint - no data was modified",
      timestamp: new Date().toISOString(),
      results: debugResults,
    });
  } catch (error) {
    console.error("[Survivor Debug] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze survivor results",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}


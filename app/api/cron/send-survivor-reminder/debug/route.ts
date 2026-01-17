import { NextResponse } from "next/server";

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

interface DebugSurvivorPick {
  survivorName: string;
  survivorId: string;
  roundName: string;
  firstMatchDate: string;
  fixtureCount: number;
  fixtures: { home: string; away: string; date: string; status: string }[];
}

interface DebugUserResult {
  userId: string;
  email: string | null;
  name: string | null;
  activeSurvivorGames: number;
  missingSurvivorPicks: DebugSurvivorPick[];
  gamesWithPicks: { survivorName: string; roundName: string; pickedTeam: string }[];
  eliminatedGames: string[];
}

// Debug endpoint - shows what emails would be sent without actually sending
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

    console.log("[Survivor Reminder Debug] Starting debug analysis...");

    // Get all users
    const allUsers = await db.select().from(users);

    const debugResults: DebugUserResult[] = [];

    // Optional: Only check specific user for testing
    const onlySendEmailsTo = process.env.ONLY_SEND_EMAILS_TO;

    for (const user of allUsers) {
      if (!user.email) continue;

      // Skip users that don't match the test email filter
      if (onlySendEmailsTo && user.email !== onlySendEmailsTo) {
        continue;
      }

      const userResult: DebugUserResult = {
        userId: user.id,
        email: user.email,
        name: user.name,
        activeSurvivorGames: 0,
        missingSurvivorPicks: [],
        gamesWithPicks: [],
        eliminatedGames: [],
      };

      // Get all survivor games this user participates in
      const userParticipations = await db
        .select({
          survivorId: survivor_game_participants.survivorGameId,
          participantId: survivor_game_participants.id,
          isEliminated: survivor_game_participants.isEliminated,
          survivorName: survivor_games.name,
          externalLeagueId: survivor_games.externalLeagueId,
          externalSeason: survivor_games.externalSeason,
          roundsSelected: survivor_games.roundsSelected,
        })
        .from(survivor_game_participants)
        .innerJoin(
          survivor_games,
          eq(survivor_game_participants.survivorGameId, survivor_games.id),
        )
        .where(eq(survivor_game_participants.userId, user.id));

      for (const participation of userParticipations) {
        // Track eliminated games
        if (participation.isEliminated) {
          userResult.eliminatedGames.push(participation.survivorName);
          continue;
        }

        userResult.activeSurvivorGames++;

        // Get the active/next round
        const activeRound = getActiveRound(participation.roundsSelected || []);

        if (!activeRound) {
          continue;
        }

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
          userResult.gamesWithPicks.push({
            survivorName: participation.survivorName,
            roundName: activeRound.roundName,
            pickedTeam: existingPick[0].externalPickedTeamName,
          });
          continue;
        }

        // Fetch fixtures for the active round
        const roundFixtures = await fetchRoundFixtures(
          participation.externalLeagueId,
          participation.externalSeason,
          activeRound.roundName,
        );

        if (roundFixtures.length === 0) {
          continue;
        }

        // Check if any match has already started
        const now = new Date();
        const upcomingFixtures = roundFixtures.filter((f) => {
          const matchDate = new Date(f.fixture.date);
          return matchDate > now && f.fixture.status.short === "NS";
        });

        // Get first match date
        const sortedFixtures = [...roundFixtures].sort(
          (a, b) =>
            new Date(a.fixture.date).getTime() -
            new Date(b.fixture.date).getTime(),
        );
        const firstMatchDate = new Date(sortedFixtures[0].fixture.date);

        userResult.missingSurvivorPicks.push({
          survivorName: participation.survivorName,
          survivorId: participation.survivorId,
          roundName: activeRound.roundName,
          firstMatchDate: firstMatchDate.toISOString(),
          fixtureCount: roundFixtures.length,
          fixtures: roundFixtures.slice(0, 5).map((f) => ({
            home: f.teams.home.name,
            away: f.teams.away.name,
            date: f.fixture.date,
            status: f.fixture.status.short,
          })),
        });
      }

      // Only include users with some survivor activity
      if (
        userResult.activeSurvivorGames > 0 ||
        userResult.eliminatedGames.length > 0
      ) {
        debugResults.push(userResult);
      }
    }

    // Summary stats
    const usersWithMissingPicks = debugResults.filter(
      (r) => r.missingSurvivorPicks.length > 0,
    );
    const totalMissingPicks = usersWithMissingPicks.reduce(
      (sum, r) => sum + r.missingSurvivorPicks.length,
      0,
    );

    return NextResponse.json({
      success: true,
      note: "This is a debug endpoint - no emails were sent",
      timestamp: new Date().toISOString(),
      summary: {
        totalUsersChecked: debugResults.length,
        usersWhoWouldReceiveEmail: usersWithMissingPicks.length,
        totalMissingSurvivorPicks: totalMissingPicks,
      },
      users: debugResults,
    });
  } catch (error) {
    console.error("[Survivor Reminder Debug] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze survivor reminders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}


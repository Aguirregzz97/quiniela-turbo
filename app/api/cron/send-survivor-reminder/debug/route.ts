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
import { calculateSurvivorStatus } from "@/lib/survivor/calculateSurvivorStatus";

interface DebugPick {
  round: string;
  teamPicked: string;
  fixtureId: string;
}

interface DebugSurvivorGame {
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
  allPicks: DebugPick[];
  needsReminder: boolean;
}

interface DebugUserResult {
  userId: string;
  email: string | null;
  name: string | null;
  survivorGames: DebugSurvivorGame[];
  wouldReceiveEmail: boolean;
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

    // Get current time info for context
    const now = new Date();
    const mexicoCityTime = now.toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
    });

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
        survivorGames: [],
        wouldReceiveEmail: false,
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
        .where(eq(survivor_game_participants.userId, user.id));

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
              eq(survivor_game_picks.userId, user.id),
            ),
          );

        // Calculate status
        const status = await calculateSurvivorStatus(
          userPicks,
          participation.roundsSelected || [],
          participation.lives,
          participation.externalLeagueId,
          participation.externalSeason,
        );

        // Get the active/next round
        const activeRound = getActiveRound(participation.roundsSelected || []);

        // Check if user already has a pick for this round
        const existingPick = activeRound
          ? userPicks.find((p) => p.externalRound === activeRound.roundName)
          : null;

        // Determine if this game needs a reminder
        const needsReminder =
          !status.isEliminated && !!activeRound && !existingPick;

        // Build all picks list
        const allPicks: DebugPick[] = userPicks.map((pick) => ({
          round: pick.externalRound,
          teamPicked: pick.externalPickedTeamName,
          fixtureId: pick.externalFixtureId,
        }));

        const gameInfo: DebugSurvivorGame = {
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
          allPicks,
          needsReminder,
        };

        userResult.survivorGames.push(gameInfo);

        if (needsReminder) {
          userResult.wouldReceiveEmail = true;
        }
      }

      // Only include users with survivor games
      if (userResult.survivorGames.length > 0) {
        debugResults.push(userResult);
      }
    }

    // Summary stats
    const usersWhoWouldReceiveEmail = debugResults.filter(
      (r) => r.wouldReceiveEmail,
    );
    const totalGamesNeedingReminder = debugResults.reduce(
      (sum, r) => sum + r.survivorGames.filter((g) => g.needsReminder).length,
      0,
    );
    const totalEliminatedUsers = debugResults.filter(
      (r) =>
        r.survivorGames.length > 0 &&
        r.survivorGames.every((g) => g.isEliminated === true),
    );

    return NextResponse.json({
      success: true,
      note: "This is a debug endpoint - no emails were sent",
      serverTime: {
        utc: now.toISOString(),
        mexicoCity: mexicoCityTime,
      },
      summary: {
        totalUsersWithSurvivorGames: debugResults.length,
        usersWhoWouldReceiveEmail: usersWhoWouldReceiveEmail.length,
        totalGamesNeedingReminder,
        usersFullyEliminated: totalEliminatedUsers.length,
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

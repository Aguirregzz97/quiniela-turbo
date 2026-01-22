"use server";

import { db } from "@/db";
import { survivor_game_picks, survivor_game_participants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchRoundFixtures, getActiveRound } from "@/lib/api-football/fetchRoundFixtures";
import { calculateSurvivorStatus } from "@/lib/survivor/calculateSurvivorStatus";

interface RoundSelected {
  roundName: string;
  dates: string[];
}

interface UserWithPendingPick {
  oderId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  isEliminated: boolean;
}

interface PendingPicksResult {
  success: boolean;
  activeRound: string | null;
  totalTeamsAvailable: number;
  usersWithPendingPick: UserWithPendingPick[];
  currentUserHasPendingPick: boolean;
  currentUserIsEliminated: boolean;
  error?: string;
}

/**
 * Gets all users with pending picks for the current round of a survivor game
 */
export async function getPendingSurvivorPicks(
  survivorGameId: string,
  currentUserId: string,
  leagueId: string,
  season: string,
  roundsSelected: RoundSelected[],
  lives: number
): Promise<PendingPicksResult> {
  try {
    // Get the active round
    const activeRound = getActiveRound(roundsSelected);

    if (!activeRound) {
      return {
        success: true,
        activeRound: null,
        totalTeamsAvailable: 0,
        usersWithPendingPick: [],
        currentUserHasPendingPick: false,
        currentUserIsEliminated: false,
      };
    }

    // Fetch fixtures for the active round
    const roundFixtures = await fetchRoundFixtures(
      leagueId,
      season,
      activeRound.roundName
    );

    // Filter only fixtures that haven't started yet
    const now = new Date();
    const upcomingFixtures = roundFixtures.filter((fixture) => {
      const matchDate = new Date(fixture.fixture.date);
      // Include matches that start in more than 5 minutes
      return matchDate.getTime() - now.getTime() > 5 * 60 * 1000;
    });

    if (upcomingFixtures.length === 0) {
      return {
        success: true,
        activeRound: activeRound.roundName,
        totalTeamsAvailable: roundFixtures.length * 2, // Each fixture has 2 teams
        usersWithPendingPick: [],
        currentUserHasPendingPick: false,
        currentUserIsEliminated: false,
      };
    }

    // Get all participants
    const participants = await db
      .select({
        oderId: survivor_game_participants.userId,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(survivor_game_participants)
      .innerJoin(users, eq(survivor_game_participants.userId, users.id))
      .where(eq(survivor_game_participants.survivorGameId, survivorGameId));

    if (participants.length === 0) {
      return {
        success: true,
        activeRound: activeRound.roundName,
        totalTeamsAvailable: upcomingFixtures.length * 2,
        usersWithPendingPick: [],
        currentUserHasPendingPick: false,
        currentUserIsEliminated: false,
      };
    }

    // Get all picks for this game
    const allPicks = await db
      .select({
        oderId: survivor_game_picks.userId,
        externalFixtureId: survivor_game_picks.externalFixtureId,
        externalRound: survivor_game_picks.externalRound,
        externalPickedTeamId: survivor_game_picks.externalPickedTeamId,
        externalPickedTeamName: survivor_game_picks.externalPickedTeamName,
      })
      .from(survivor_game_picks)
      .where(eq(survivor_game_picks.survivorGameId, survivorGameId));

    // Group picks by user
    const picksByUser = new Map<
      string,
      {
        externalFixtureId: string;
        externalRound: string;
        externalPickedTeamId: string;
        externalPickedTeamName: string;
      }[]
    >();

    // Initialize all participants with empty picks array
    for (const participant of participants) {
      picksByUser.set(participant.oderId, []);
    }

    // Add actual picks
    for (const pick of allPicks) {
      const existing = picksByUser.get(pick.oderId) || [];
      existing.push({
        externalFixtureId: pick.externalFixtureId,
        externalRound: pick.externalRound,
        externalPickedTeamId: pick.externalPickedTeamId,
        externalPickedTeamName: pick.externalPickedTeamName,
      });
      picksByUser.set(pick.oderId, existing);
    }

    // Calculate pending picks for each user
    const usersWithPendingPick: UserWithPendingPick[] = [];
    let currentUserHasPendingPick = false;
    let currentUserIsEliminated = false;

    for (const participant of participants) {
      const userPicks = picksByUser.get(participant.oderId) || [];

      // Calculate if user is eliminated
      const status = await calculateSurvivorStatus(
        userPicks.map((p, i) => ({ id: `temp-${i}`, ...p })),
        roundsSelected,
        lives,
        leagueId,
        season
      );

      // Skip eliminated users for pending picks count
      if (status.isEliminated) {
        if (participant.oderId === currentUserId) {
          currentUserIsEliminated = true;
        }
        continue;
      }

      // Check if user has a pick for the active round
      const hasPickForActiveRound = userPicks.some(
        (pick) => pick.externalRound === activeRound.roundName
      );

      if (!hasPickForActiveRound) {
        usersWithPendingPick.push({
          oderId: participant.oderId,
          userName: participant.userName,
          userEmail: participant.userEmail,
          userImage: participant.userImage,
          isEliminated: false,
        });

        if (participant.oderId === currentUserId) {
          currentUserHasPendingPick = true;
        }
      }
    }

    return {
      success: true,
      activeRound: activeRound.roundName,
      totalTeamsAvailable: upcomingFixtures.length * 2,
      usersWithPendingPick,
      currentUserHasPendingPick,
      currentUserIsEliminated,
    };
  } catch (error) {
    console.error("Error getting pending survivor picks:", error);
    return {
      success: false,
      activeRound: null,
      totalTeamsAvailable: 0,
      usersWithPendingPick: [],
      currentUserHasPendingPick: false,
      currentUserIsEliminated: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}


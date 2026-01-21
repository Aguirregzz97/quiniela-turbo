"use server";

import { db } from "@/db";
import { predictions, quiniela_participants, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { fetchRoundFixtures } from "@/lib/api-football/fetchRoundFixtures";
import { MEXICO_CITY_TIMEZONE } from "@/lib/constants";

interface RoundSelected {
  roundName: string;
  dates: string[];
}

interface UserWithPendingPredictions {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  pendingCount: number;
  totalFixtures: number;
}

interface PendingPredictionsResult {
  success: boolean;
  activeRound: string | null;
  totalFixtures: number;
  usersWithPending: UserWithPendingPredictions[];
  currentUserHasPending: boolean;
  currentUserPendingCount: number;
  error?: string;
}

/**
 * Determines the current/next active round from a list of rounds
 * Returns the first round that is still ongoing or hasn't started yet.
 */
function getActiveRound(
  rounds: RoundSelected[]
): RoundSelected | null {
  if (!rounds.length) return null;

  // Get today's date in Mexico City timezone
  const now = new Date();
  const mexicoCityDate = now.toLocaleDateString("en-CA", {
    timeZone: MEXICO_CITY_TIMEZONE,
  }); // Returns YYYY-MM-DD format
  const today = new Date(mexicoCityDate + "T00:00:00");

  for (const round of rounds) {
    if (round.dates.length === 0) continue;

    // Get the last date of the round (end date)
    const roundEndDate = round.dates[round.dates.length - 1];
    const roundEnd = new Date(roundEndDate + "T00:00:00");

    // Return the first round whose end date is today or in the future
    if (roundEnd >= today) {
      return round;
    }
  }

  // If no ongoing/future round found, return the last round
  return rounds[rounds.length - 1];
}

/**
 * Gets all users with pending predictions for the current round of a quiniela
 */
export async function getPendingPredictions(
  quinielaId: string,
  currentUserId: string,
  leagueId: string,
  season: string,
  roundsSelected: RoundSelected[]
): Promise<PendingPredictionsResult> {
  try {
    // Get the active round
    const activeRound = getActiveRound(roundsSelected);

    if (!activeRound) {
      return {
        success: true,
        activeRound: null,
        totalFixtures: 0,
        usersWithPending: [],
        currentUserHasPending: false,
        currentUserPendingCount: 0,
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
        totalFixtures: roundFixtures.length,
        usersWithPending: [],
        currentUserHasPending: false,
        currentUserPendingCount: 0,
      };
    }

    // Get all participants
    const participants = await db
      .select({
        userId: quiniela_participants.userId,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(quiniela_participants)
      .innerJoin(users, eq(quiniela_participants.userId, users.id))
      .where(eq(quiniela_participants.quinielaId, quinielaId));

    if (participants.length === 0) {
      return {
        success: true,
        activeRound: activeRound.roundName,
        totalFixtures: upcomingFixtures.length,
        usersWithPending: [],
        currentUserHasPending: false,
        currentUserPendingCount: 0,
      };
    }

    // Get fixture IDs for upcoming matches
    const fixtureIds = upcomingFixtures.map((f) => f.fixture.id.toString());

    // Get all predictions for this quiniela and these fixtures
    const allPredictions = await db
      .select({
        userId: predictions.userId,
        externalFixtureId: predictions.externalFixtureId,
        predictedHomeScore: predictions.predictedHomeScore,
        predictedAwayScore: predictions.predictedAwayScore,
      })
      .from(predictions)
      .where(
        and(
          eq(predictions.quinielaId, quinielaId),
          inArray(predictions.externalFixtureId, fixtureIds)
        )
      );

    // Create a map of user predictions
    // A prediction is "complete" only if both scores are not null
    const userPredictionsMap = new Map<string, Set<string>>();

    for (const prediction of allPredictions) {
      if (
        prediction.predictedHomeScore !== null &&
        prediction.predictedAwayScore !== null
      ) {
        if (!userPredictionsMap.has(prediction.userId)) {
          userPredictionsMap.set(prediction.userId, new Set());
        }
        userPredictionsMap.get(prediction.userId)!.add(prediction.externalFixtureId);
      }
    }

    // Calculate pending predictions for each user
    const usersWithPending: UserWithPendingPredictions[] = [];
    let currentUserHasPending = false;
    let currentUserPendingCount = 0;

    for (const participant of participants) {
      const completedPredictions = userPredictionsMap.get(participant.userId) || new Set();
      const pendingCount = upcomingFixtures.length - completedPredictions.size;

      if (pendingCount > 0) {
        usersWithPending.push({
          userId: participant.userId,
          userName: participant.userName,
          userEmail: participant.userEmail,
          userImage: participant.userImage,
          pendingCount,
          totalFixtures: upcomingFixtures.length,
        });

        if (participant.userId === currentUserId) {
          currentUserHasPending = true;
          currentUserPendingCount = pendingCount;
        }
      }
    }

    // Sort by pending count (most pending first)
    usersWithPending.sort((a, b) => b.pendingCount - a.pendingCount);

    return {
      success: true,
      activeRound: activeRound.roundName,
      totalFixtures: upcomingFixtures.length,
      usersWithPending,
      currentUserHasPending,
      currentUserPendingCount,
    };
  } catch (error) {
    console.error("Error getting pending predictions:", error);
    return {
      success: false,
      activeRound: null,
      totalFixtures: 0,
      usersWithPending: [],
      currentUserHasPending: false,
      currentUserPendingCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}


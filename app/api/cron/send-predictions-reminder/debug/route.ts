import { NextResponse } from "next/server";

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

interface DebugMissingPrediction {
  quinielaName: string;
  quinielaId: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  status: string;
}

interface DebugUserResult {
  userId: string;
  email: string | null;
  name: string | null;
  quinielas: number;
  missingPredictions: DebugMissingPrediction[];
  completedPredictions: {
    quinielaName: string;
    fixtureId: string;
    homeTeam: string;
    awayTeam: string;
    predictedHome: number | null;
    predictedAway: number | null;
  }[];
  skippedFixtures: {
    quinielaName: string;
    fixtureId: string;
    homeTeam: string;
    awayTeam: string;
    reason: string;
  }[];
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

    console.log("[Predictions Reminder Debug] Starting debug analysis...");

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
        quinielas: 0,
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
        .where(eq(quiniela_participants.userId, user.id));

      userResult.quinielas = userParticipations.length;

      for (const participation of userParticipations) {
        // Get the active/next round
        const activeRound = getActiveRound(participation.roundsSelected || []);

        if (!activeRound) {
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

        // Map predictions by fixture ID
        const predictionsByFixture = new Map(
          existingPredictions.map((p) => [p.externalFixtureId, p]),
        );

        // Check each fixture
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

          // Check if match has already started
          if (matchDate <= now) {
            userResult.skippedFixtures.push({
              ...fixtureInfo,
              reason: `Match already started/finished (${fixture.fixture.status.short})`,
            });
            continue;
          }

          // Check if prediction exists with actual values
          if (
            prediction &&
            prediction.predictedHomeScore !== null &&
            prediction.predictedAwayScore !== null
          ) {
            userResult.completedPredictions.push({
              ...fixtureInfo,
              predictedHome: prediction.predictedHomeScore,
              predictedAway: prediction.predictedAwayScore,
            });
          } else {
            userResult.missingPredictions.push({
              ...fixtureInfo,
              matchDate: fixture.fixture.date,
              status: fixture.fixture.status.short,
            });
          }
        }
      }

      // Only include users with some quiniela activity
      if (userResult.quinielas > 0) {
        debugResults.push(userResult);
      }
    }

    // Summary stats
    const usersWithMissingPredictions = debugResults.filter(
      (r) => r.missingPredictions.length > 0,
    );
    const totalMissingPredictions = usersWithMissingPredictions.reduce(
      (sum, r) => sum + r.missingPredictions.length,
      0,
    );

    // Get active round info for context
    const sampleQuiniela = await db.select().from(quinielas).limit(1);
    let activeRoundInfo = null;
    if (sampleQuiniela.length > 0) {
      const activeRound = getActiveRound(
        sampleQuiniela[0].roundsSelected || [],
      );
      if (activeRound) {
        activeRoundInfo = {
          roundName: activeRound.roundName,
          dates: activeRound.dates,
        };
      }
    }

    return NextResponse.json({
      success: true,
      note: "This is a debug endpoint - no emails were sent",
      timestamp: new Date().toISOString(),
      activeRound: activeRoundInfo,
      summary: {
        totalUsersChecked: debugResults.length,
        usersWhoWouldReceiveEmail: usersWithMissingPredictions.length,
        totalMissingPredictions: totalMissingPredictions,
      },
      users: debugResults,
    });
  } catch (error) {
    console.error("[Predictions Reminder Debug] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze predictions reminders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

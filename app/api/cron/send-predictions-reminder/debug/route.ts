import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skipCache = searchParams.get("skipCache") === "true";

    const debugInfo: Record<string, unknown> = {};

    // Show date info
    const now = new Date();
    debugInfo.dateInfo = {
      serverTime: now.toISOString(),
      serverTimeLocal: now.toString(),
      skipCache,
    };

    // Step 1: Get all users
    const allUsers = await db.select().from(users);
    debugInfo.totalUsers = allUsers.length;
    debugInfo.users = allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
    }));

    // Step 2: For each user, get their quinielas
    const userQuinielas: Record<string, unknown>[] = [];

    for (const user of allUsers) {
      if (!user.email) continue;

      const participations = await db
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

      const quinielaDetails = [];

      for (const p of participations) {
        // Step 3: Get active round and fetch its fixtures
        const activeRound = getActiveRound(p.roundsSelected || []);

        if (!activeRound) {
          quinielaDetails.push({
            quinielaName: p.quinielaName,
            quinielaId: p.quinielaId,
            leagueId: p.externalLeagueId,
            season: p.externalSeason,
            activeRound: null,
            error: "No active round found",
          });
          continue;
        }

        const roundFixtures = await fetchRoundFixtures(
          p.externalLeagueId,
          p.externalSeason,
          activeRound.roundName,
          skipCache,
        );

        // Step 4: Get existing predictions
        const fixtureIds = roundFixtures.map((f) => f.fixture.id.toString());

        let existingPreds: { externalFixtureId: string }[] = [];
        if (fixtureIds.length > 0) {
          existingPreds = await db
            .select({ externalFixtureId: predictions.externalFixtureId })
            .from(predictions)
            .where(
              and(
                eq(predictions.userId, user.id),
                eq(predictions.quinielaId, p.quinielaId),
                inArray(predictions.externalFixtureId, fixtureIds),
              ),
            );
        }

        const predictedIds = new Set(
          existingPreds.map((e) => e.externalFixtureId),
        );

        // Find missing (not predicted + not started)
        const currentTime = new Date();
        const missingFixtures = roundFixtures.filter((f) => {
          const fixtureId = f.fixture.id.toString();
          const matchDate = new Date(f.fixture.date);
          const isPredicted = predictedIds.has(fixtureId);
          const hasNotStarted = matchDate > currentTime;
          return !isPredicted && hasNotStarted;
        });

        quinielaDetails.push({
          quinielaName: p.quinielaName,
          quinielaId: p.quinielaId,
          leagueId: p.externalLeagueId,
          season: p.externalSeason,
          activeRound: activeRound.roundName,
          activeRoundDates: activeRound.dates,
          roundFixturesCount: roundFixtures.length,
          roundFixtures: roundFixtures.map((f) => ({
            id: f.fixture.id,
            date: f.fixture.date,
            status: f.fixture.status.short,
            home: f.teams.home.name,
            away: f.teams.away.name,
            hasStarted: new Date(f.fixture.date) <= currentTime,
          })),
          existingPredictionsCount: existingPreds.length,
          existingPredictionFixtureIds: existingPreds.map(
            (e) => e.externalFixtureId,
          ),
          missingPredictionsCount: missingFixtures.length,
          missingFixtures: missingFixtures.map((f) => ({
            id: f.fixture.id,
            date: f.fixture.date,
            home: f.teams.home.name,
            away: f.teams.away.name,
          })),
        });
      }

      userQuinielas.push({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        participationsCount: participations.length,
        quinielas: quinielaDetails,
        totalMissingPredictions: quinielaDetails.reduce(
          (sum, q) => sum + (q.missingPredictionsCount as number),
          0,
        ),
      });
    }

    debugInfo.userQuinielas = userQuinielas;

    // Summary
    debugInfo.summary = {
      usersWithMissingPredictions: userQuinielas.filter(
        (u) => (u.totalMissingPredictions as number) > 0,
      ).length,
      totalMissingPredictions: userQuinielas.reduce(
        (sum, u) => sum + (u.totalMissingPredictions as number),
        0,
      ),
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

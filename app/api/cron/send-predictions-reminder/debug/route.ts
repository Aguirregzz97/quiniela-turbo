import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { db } from "@/db";
import { users, quinielas } from "@/db/schema";
import { getActiveRound } from "@/lib/rounds";
import { analyzeUserPredictions } from "@/lib/cron/predictions-reminder";

// Debug endpoint — shows what emails would be sent without actually sending
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Predictions Reminder Debug] Starting debug analysis...");

    const allUsers = await db.select().from(users);
    const onlySendEmailsTo = process.env.ONLY_SEND_EMAILS_TO;

    const debugResults: {
      userId: string;
      email: string | null;
      name: string | null;
      quinielas: number;
      missingPredictions: {
        quinielaName: string;
        quinielaId: string;
        fixtureId: string;
        homeTeam: string;
        awayTeam: string;
        matchDate: string;
        status: string;
      }[];
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
    }[] = [];

    for (const user of allUsers) {
      if (!user.email) continue;
      if (onlySendEmailsTo && user.email !== onlySendEmailsTo) continue;

      const analysis = await analyzeUserPredictions(user.id);

      if (analysis.quinielasCount === 0) continue;

      debugResults.push({
        userId: user.id,
        email: user.email,
        name: user.name,
        quinielas: analysis.quinielasCount,
        missingPredictions: analysis.missingPredictions.map((mp) => ({
          quinielaName: mp.quinielaName,
          quinielaId: mp.quinielaId,
          fixtureId: mp.fixture.fixture.id.toString(),
          homeTeam: mp.fixture.teams.home.name,
          awayTeam: mp.fixture.teams.away.name,
          matchDate: mp.fixture.fixture.date,
          status: mp.fixture.fixture.status.short,
        })),
        completedPredictions: analysis.completedPredictions.map((cp) => ({
          quinielaName: cp.quinielaName,
          fixtureId: cp.fixtureId,
          homeTeam: cp.homeTeam,
          awayTeam: cp.awayTeam,
          predictedHome: cp.predictedHome,
          predictedAway: cp.predictedAway,
        })),
        skippedFixtures: analysis.skippedFixtures.map((sf) => ({
          quinielaName: sf.quinielaName,
          fixtureId: sf.fixtureId,
          homeTeam: sf.homeTeam,
          awayTeam: sf.awayTeam,
          reason: sf.reason,
        })),
      });
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
        totalMissingPredictions,
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

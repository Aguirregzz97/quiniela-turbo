import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { db } from "@/db";
import { users } from "@/db/schema";
import {
  analyzeUserSurvivorPicks,
  type SurvivorGameDetail,
} from "@/lib/cron/survivor-reminder";

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

    console.log("[Survivor Reminder Debug] Starting debug analysis...");

    const allUsers = await db.select().from(users);
    const onlySendEmailsTo = process.env.ONLY_SEND_EMAILS_TO;

    const now = new Date();
    const mexicoCityTime = now.toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
    });

    const debugResults: {
      userId: string;
      email: string | null;
      name: string | null;
      survivorGames: SurvivorGameDetail[];
      wouldReceiveEmail: boolean;
    }[] = [];

    for (const user of allUsers) {
      if (!user.email) continue;
      if (onlySendEmailsTo && user.email !== onlySendEmailsTo) continue;

      const analysis = await analyzeUserSurvivorPicks(user.id);

      if (analysis.gameDetails.length === 0) continue;

      debugResults.push({
        userId: user.id,
        email: user.email,
        name: user.name,
        survivorGames: analysis.gameDetails,
        wouldReceiveEmail: analysis.missingSurvivorPicks.length > 0,
      });
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
        r.survivorGames.every((g) => g.isEliminated),
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

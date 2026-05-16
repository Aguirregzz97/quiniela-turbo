import { NextResponse } from "next/server";
import { syncRoundDatesForAllQuinielas } from "@/lib/cron/sync-round-dates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Sync Round Dates] Starting cron job...");

    const result = await syncRoundDatesForAllQuinielas();

    console.log(
      `[Sync Round Dates] Done. Checked ${result.quinielasChecked}, updated ${result.quinielasUpdated}, errors ${result.errors}`,
    );

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Sync Round Dates] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync round dates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

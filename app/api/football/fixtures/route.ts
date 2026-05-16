import { NextRequest, NextResponse } from "next/server";
import { FixturesApiResponse } from "@/types/fixtures";
import { fetchFixtures } from "@/lib/api-football/fetchFixtures";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("league") || undefined;
  const season = searchParams.get("season") || undefined;
  const fromDate = searchParams.get("from") || undefined;
  const toDate = searchParams.get("to") || undefined;
  const last = searchParams.get("last") || undefined;
  const team = searchParams.get("team") || undefined;

  const data = await fetchFixtures({
    leagueId,
    season,
    fromDate,
    toDate,
    last,
    team,
  });

  if (data) {
    return NextResponse.json(data);
  }

  // Fall back to bundled sample data so the UI keeps working when the
  // upstream API is unreachable. The shared helper logs the underlying
  // error already.
  try {
    const fixturesData = await import("@/utils/sample_data/fixtures.json");
    return NextResponse.json(fixturesData.default as FixturesApiResponse);
  } catch (fallbackError) {
    console.error("Error loading fallback fixtures data:", fallbackError);
    return NextResponse.json(
      { error: "Failed to fetch fixtures data" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import redis from "@/redisClient";
import { FixturesApiResponse } from "@/types/fixtures";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("league") || "262";
    const season =
      searchParams.get("season") || new Date().getFullYear().toString();
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // Create cache key
    const cacheKey = `fixtures:${leagueId}:${season}:${fromDate}:${toDate}`;

    // Try to get from Redis cache first
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log("Returning cached fixtures data");
      return NextResponse.json(JSON.parse(cachedData) as FixturesApiResponse);
    }

    // If not in cache, make API call
    console.log("Fetching fresh fixtures data from API");

    const apiUrl = process.env.FOOTBALL_API_URL;
    const apiKey = process.env.FOOTBALL_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("Football API URL or API Key not configured");
    }

    const params: Record<string, string> = {
      league: leagueId,
      season: season,
    };

    // Add date filters if provided
    if (fromDate) {
      params.from = fromDate;
    }
    if (toDate) {
      params.to = toDate;
    }

    const response = await axios.get(`${apiUrl}/fixtures`, {
      params,
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": new URL(apiUrl).hostname,
      },
    });

    const data = response.data as FixturesApiResponse;

    // Cache the result for 30 minutes (1800 seconds)
    await redis.setex(cacheKey, 1800, JSON.stringify(data));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching fixtures:", error);

    // Fallback to static data if API fails
    console.log("Falling back to static fixtures data");
    try {
      const fixturesData = await import("@/utils/sample_data/fixtures.json");
      return NextResponse.json(fixturesData.default as FixturesApiResponse);
    } catch (fallbackError) {
      console.error("Error loading fallback data:", fallbackError);
      return NextResponse.json(
        { error: "Failed to fetch fixtures data" },
        { status: 500 },
      );
    }
  }
}

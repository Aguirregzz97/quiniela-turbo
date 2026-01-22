import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import redis from "@/redisClient";
import { FixturesApiResponse } from "@/types/fixtures";
import { MEXICO_CITY_TIMEZONE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("league");
    const season = searchParams.get("season");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const last = searchParams.get("last");
    const team = searchParams.get("team");

    // Create cache key based on all parameters
    const cacheKey = `fixtures:${leagueId}:${season}:${fromDate}:${toDate}:${last}:${team}`;

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
      timezone: MEXICO_CITY_TIMEZONE,
    };

    // Add league and season if provided
    if (leagueId) {
      params.league = leagueId;
    }
    if (season) {
      params.season = season;
    }

    // Add date filters if provided
    if (fromDate) {
      params.from = fromDate;
    }
    if (toDate) {
      params.to = toDate;
    }

    // Add last parameter for fetching last N fixtures
    if (last) {
      params.last = last;
    }

    // Add team parameter for filtering by team
    if (team) {
      params.team = team;
    }

    const response = await axios.get(`${apiUrl}/fixtures`, {
      params,
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": new URL(apiUrl).hostname,
      },
    });

    const data = response.data as FixturesApiResponse;

    // Cache the result for 5 minutes (300 seconds)
    await redis.setex(cacheKey, 300, JSON.stringify(data));

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

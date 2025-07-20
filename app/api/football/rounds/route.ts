import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import redis from "@/redisClient";
import { RoundsApiResponse } from "@/types/rounds";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("league") || "262";
    const season =
      searchParams.get("season") || new Date().getFullYear().toString();

    // Create cache key
    const cacheKey = `rounds:${leagueId}:${season}`;

    // Try to get from Redis cache first
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log("Returning cached rounds data");
      return NextResponse.json(JSON.parse(cachedData) as RoundsApiResponse);
    }

    // If not in cache, make API call
    console.log("Fetching fresh rounds data from API");

    const apiUrl = process.env.FOOTBALL_API_URL;
    const apiKey = process.env.FOOTBALL_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("Football API URL or API Key not configured");
    }

    const response = await axios.get(`${apiUrl}/fixtures/rounds`, {
      params: {
        league: leagueId,
        season: season,
        dates: "true",
      },
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": new URL(apiUrl).hostname,
      },
    });

    const data = response.data as RoundsApiResponse;

    // Cache the result for 1 hour (3600 seconds)
    await redis.setex(cacheKey, 3600, JSON.stringify(data));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching rounds:", error);

    // Fallback to static data if API fails
    console.log("Falling back to static rounds data");
    try {
      const roundsData = await import("@/utils/sample_data/rounds.json");
      return NextResponse.json(roundsData.default as RoundsApiResponse);
    } catch (fallbackError) {
      console.error("Error loading fallback data:", fallbackError);
      return NextResponse.json(
        { error: "Failed to fetch rounds data" },
        { status: 500 },
      );
    }
  }
}

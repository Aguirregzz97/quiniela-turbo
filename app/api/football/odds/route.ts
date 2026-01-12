import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import redis from "@/redisClient";
import { OddsApiResponse } from "@/types/odds";

// Bet365 bookmaker ID
const BET365_BOOKMAKER_ID = 8;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fixtureId = searchParams.get("fixture");

    if (!fixtureId) {
      return NextResponse.json(
        { error: "Fixture ID is required" },
        { status: 400 },
      );
    }

    // Create cache key
    const cacheKey = `odds:${fixtureId}:${BET365_BOOKMAKER_ID}`;

    // Try to get from Redis cache first
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log("Returning cached odds data");
      return NextResponse.json(JSON.parse(cachedData) as OddsApiResponse);
    }

    // If not in cache, make API call
    console.log("Fetching fresh odds data from API");

    const apiUrl = process.env.FOOTBALL_API_URL;
    const apiKey = process.env.FOOTBALL_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("Football API URL or API Key not configured");
    }

    const response = await axios.get(`${apiUrl}/odds`, {
      params: {
        fixture: fixtureId,
        bookmaker: BET365_BOOKMAKER_ID,
      },
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": new URL(apiUrl).hostname,
      },
    });

    const data = response.data as OddsApiResponse;

    // Cache the result for 30 minutes (1800 seconds) - odds don't change as frequently
    await redis.setex(cacheKey, 1800, JSON.stringify(data));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching odds:", error);
    return NextResponse.json(
      { error: "Failed to fetch odds data" },
      { status: 500 },
    );
  }
}



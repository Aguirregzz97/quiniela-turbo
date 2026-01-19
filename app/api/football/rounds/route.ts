import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import redis from "@/redisClient";
import { RoundsApiResponse, RoundData } from "@/types/rounds";
import { MEXICO_CITY_TIMEZONE } from "@/lib/constants";

type Tournament = "apertura" | "clausura";

// Playoff rounds that belong to Apertura (between Apertura regular season and Clausura)
const APERTURA_PLAYOFF_ROUNDS = [
  "Play-In Semi-finals",
  "Play-In Final",
  "Quarter-finals",
  "Semi-finals",
  "Final",
];

/**
 * Determines which tournament a round belongs to
 */
function getRoundTournament(round: RoundData): Tournament | null {
  const roundName = round.round.toLowerCase();

  if (roundName.startsWith("apertura")) {
    return "apertura";
  }

  if (roundName.startsWith("clausura")) {
    return "clausura";
  }

  // Playoff rounds between Apertura and Clausura belong to Apertura
  if (APERTURA_PLAYOFF_ROUNDS.some((pr) => round.round === pr)) {
    return "apertura";
  }

  return null;
}

/**
 * Determines the current tournament based on today's date
 * by finding the next upcoming round or the most recent one
 */
function detectCurrentTournament(rounds: RoundData[]): Tournament {
  // Get today's date in Mexico City timezone
  const now = new Date();
  const mexicoCityDate = now.toLocaleDateString("en-CA", {
    timeZone: MEXICO_CITY_TIMEZONE,
  }); // Returns YYYY-MM-DD format
  const today = new Date(mexicoCityDate + "T00:00:00");

  const upcomingRound = rounds.find((round) =>
    round.dates.some((dateStr) => {
      // Dates from API are in Mexico City timezone (YYYY-MM-DD format)
      const date = new Date(dateStr + "T00:00:00");
      return date >= today;
    }),
  );

  if (!upcomingRound) {
    return "apertura";
  }

  const isApertura = upcomingRound.round.toLowerCase().startsWith("apertura");

  return isApertura ? "apertura" : "clausura";
}

/**
 * Filters rounds to only include those from the specified tournament
 */
function filterRoundsByTournament(
  rounds: RoundData[],
  tournament: Tournament,
): RoundData[] {
  return rounds.filter((round) => getRoundTournament(round) === tournament);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("league") || "262";
    const season =
      searchParams.get("season") || new Date().getFullYear().toString();
    // Optional: allow explicit tournament selection, otherwise auto-detect
    const tournamentParam = searchParams.get("tournament") as Tournament | null;
    // Allow forcing a cache refresh with ?refresh=true
    const forceRefresh = searchParams.get("refresh") === "true";

    // Create cache key (without tournament filter since we cache the full response)
    const cacheKey = `rounds:${leagueId}:${season}`;

    let data: RoundsApiResponse;

    // Try to get from Redis cache first (unless refresh is forced)
    const cachedData = forceRefresh ? null : await redis.get(cacheKey);

    if (cachedData) {
      console.log("Returning cached rounds data");
      data = JSON.parse(cachedData) as RoundsApiResponse;
    } else {
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
          timezone: MEXICO_CITY_TIMEZONE,
        },
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": new URL(apiUrl).hostname,
        },
      });

      data = response.data as RoundsApiResponse;

      // Cache the result for 1 hour (3600 seconds)
      await redis.setex(cacheKey, 3600, JSON.stringify(data));
    }

    // Determine which tournament to filter by
    const tournament =
      tournamentParam || detectCurrentTournament(data.response);

    // Filter rounds by tournament
    const filteredRounds = filterRoundsByTournament(data.response, tournament);

    // Return filtered response with tournament info
    return NextResponse.json({
      ...data,
      response: filteredRounds,
      results: filteredRounds.length,
      currentTournament: tournament,
    });
  } catch (error) {
    console.error("Error fetching rounds:", error);

    // Fallback to static data if API fails
    console.log("Falling back to static rounds data");
    try {
      const roundsData = await import("@/utils/sample_data/rounds.json");
      const data = roundsData.default as RoundsApiResponse;

      // Still apply tournament filtering to fallback data
      const tournament = detectCurrentTournament(data.response);
      const filteredRounds = filterRoundsByTournament(
        data.response,
        tournament,
      );

      return NextResponse.json({
        ...data,
        response: filteredRounds,
        results: filteredRounds.length,
        currentTournament: tournament,
      });
    } catch (fallbackError) {
      console.error("Error loading fallback data:", fallbackError);
      return NextResponse.json(
        { error: "Failed to fetch rounds data" },
        { status: 500 },
      );
    }
  }
}

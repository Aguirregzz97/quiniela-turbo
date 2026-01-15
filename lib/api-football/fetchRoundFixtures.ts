import axios from "axios";
import redis from "@/redisClient";
import { FixturesApiResponse, FixtureData } from "@/types/fixtures";

/**
 * Determines the current/next active round from a list of rounds
 * Returns the first round whose start date is today or in the future.
 * This ensures we move to the next round once a round's first match day has passed.
 */
export function getActiveRound(
  rounds: { roundName: string; dates: string[] }[],
): { roundName: string; dates: string[] } | null {
  if (!rounds.length) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const round of rounds) {
    if (round.dates.length === 0) continue;

    const roundStart = new Date(round.dates[0]);
    roundStart.setHours(0, 0, 0, 0);

    // Return the first round whose start date is today or in the future
    if (roundStart >= today) {
      return round;
    }
  }

  // If no future round found, return the last round (all rounds have started)
  return rounds[rounds.length - 1];
}

/**
 * Fetches fixtures for a specific round from the Football API
 * This is a server-side function for use in cron jobs and server actions
 *
 * @param leagueId - The external league ID
 * @param season - The season year
 * @param roundName - The round name (e.g., "Regular Season - 1")
 * @param skipCache - Skip Redis cache and fetch fresh data
 */
export async function fetchRoundFixtures(
  leagueId: string,
  season: string,
  roundName: string,
  skipCache: boolean = false,
): Promise<FixtureData[]> {
  console.log(
    `[fetchRoundFixtures] League: ${leagueId}, Season: ${season}, Round: ${roundName}`,
  );

  // Create cache key
  const cacheKey = `fixtures:round:${leagueId}:${season}:${encodeURIComponent(roundName)}`;

  // Try to get from Redis cache first (unless skipCache is true)
  if (!skipCache) {
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log(
        `[fetchRoundFixtures] Returning cached fixtures for round "${roundName}"`,
      );
      const parsed = JSON.parse(cachedData) as FixtureData[];
      console.log(
        `[fetchRoundFixtures] Cached fixtures count: ${parsed.length}`,
      );
      return parsed;
    }
  }

  // If not in cache, make API call
  console.log(
    `[fetchRoundFixtures] Fetching fresh fixtures from API for round "${roundName}"`,
  );

  const apiUrl = process.env.FOOTBALL_API_URL;
  const apiKey = process.env.FOOTBALL_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error(
      "[fetchRoundFixtures] Football API URL or API Key not configured",
    );
    return [];
  }

  try {
    const response = await axios.get(`${apiUrl}/fixtures`, {
      params: {
        league: leagueId,
        season: season,
        round: roundName,
      },
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": new URL(apiUrl).hostname,
      },
    });

    const data = response.data as FixturesApiResponse;
    const fixtures = data.response || [];

    console.log(
      `[fetchRoundFixtures] API returned ${fixtures.length} fixtures for round "${roundName}"`,
    );

    // Log each fixture for debugging
    fixtures.forEach((f) => {
      console.log(
        `[fetchRoundFixtures] - ${f.teams.home.name} vs ${f.teams.away.name} at ${f.fixture.date}`,
      );
    });

    // Cache the result for 30 minutes (1800 seconds)
    await redis.setex(cacheKey, 1800, JSON.stringify(fixtures));

    return fixtures;
  } catch (error) {
    console.error(
      `[fetchRoundFixtures] Error fetching fixtures for round "${roundName}":`,
      error,
    );
    return [];
  }
}

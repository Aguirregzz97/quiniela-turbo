import axios from "axios";
import redis from "@/redisClient";
import { FixturesApiResponse } from "@/types/fixtures";
import { MEXICO_CITY_TIMEZONE } from "@/lib/constants";

export interface FetchFixturesParams {
  leagueId?: string;
  season?: string;
  fromDate?: string;
  toDate?: string;
  last?: string | number;
  team?: string | number;
}

/**
 * Server-side fetcher for api-football's `/fixtures` endpoint.
 *
 * Backs both the public `/api/football/fixtures` route (called from the
 * client via `useFixtures`) and any server-side caller that needs the
 * same data (cron jobs, server actions). Sharing the implementation
 * keeps the Redis cache key and TTL consistent across both call paths
 * so client and server reads share the same cache entry.
 *
 * Returns the raw api-football response shape; callers who only need
 * `.response` should pull it from there.
 *
 * Returns `null` when the API key/url is missing or the upstream call
 * fails so the caller can decide whether to fall back to sample data
 * (the route layer does this) or just return an empty list (cron).
 */
export async function fetchFixtures({
  leagueId,
  season,
  fromDate,
  toDate,
  last,
  team,
}: FetchFixturesParams): Promise<FixturesApiResponse | null> {
  // Cache key matches what `/api/football/fixtures` was using before this
  // helper existed, so we don't invalidate any in-flight cached data.
  const cacheKey = `fixtures:${leagueId}:${season}:${fromDate}:${toDate}:${last}:${team}`;

  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    console.log(`[fetchFixtures] Returning cached data for ${cacheKey}`);
    return JSON.parse(cachedData) as FixturesApiResponse;
  }

  const apiUrl = process.env.FOOTBALL_API_URL;
  const apiKey = process.env.FOOTBALL_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("[fetchFixtures] Football API URL or API Key not configured");
    return null;
  }

  const params: Record<string, string | number> = {
    timezone: MEXICO_CITY_TIMEZONE,
  };
  if (leagueId) params.league = leagueId;
  if (season) params.season = season;
  if (fromDate) params.from = fromDate;
  if (toDate) params.to = toDate;
  if (last) params.last = last;
  if (team) params.team = team;

  try {
    const response = await axios.get(`${apiUrl}/fixtures`, {
      params,
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": new URL(apiUrl).hostname,
      },
    });

    const data = response.data as FixturesApiResponse;

    // Cache for 5 minutes — same TTL the route used historically.
    await redis.setex(cacheKey, 300, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error(
      `[fetchFixtures] Error fetching fixtures (${cacheKey}):`,
      error,
    );
    return null;
  }
}

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import redis from "@/redisClient";
import { OddsApiResponse } from "@/types/odds";

// Bet365 bookmaker ID
const BET365_BOOKMAKER_ID = 8;

/**
 * In-flight request map. When two requests come in for the same fixture
 * within the same Node process, the second one awaits the first one's
 * upstream call instead of firing a duplicate. This is the single most
 * effective lever for staying under api-football's 300/min Pro cap
 * because cache misses tend to align: e.g. a round opens, 5 users land
 * on the predictions page within seconds, and without dedup we fire 5x
 * the upstream calls for the same fixtures.
 *
 * Note: This map is per-Lambda-container, so on Vercel it dedupes
 * within a single warm container but not across containers. Combined
 * with the 30-minute Redis cache below, this is good enough for our
 * scale — by the time a second container needs the same fixture,
 * Redis has the answer.
 */
const inflight = new Map<string, Promise<OddsApiResponse>>();

/**
 * api-football's rate-limit response is a 200 OK with this shape:
 *   {
 *     "errors": { "rateLimit": "Too many requests..." },
 *     "response": []
 *   }
 * We must NOT cache these — caching a rate-limit error for 30 minutes
 * means we serve "no odds" for that fixture long after the per-minute
 * window has rolled over. Treat it as a transient failure so the next
 * caller gets a chance to retry.
 */
function isRateLimitError(data: OddsApiResponse): boolean {
  if (!data || typeof data !== "object") return false;
  const errors = (data as { errors?: unknown }).errors;
  if (!errors || typeof errors !== "object") return false;
  return "rateLimit" in (errors as Record<string, unknown>);
}

async function fetchOddsFromApi(fixtureId: string): Promise<OddsApiResponse> {
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

  return response.data as OddsApiResponse;
}

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

    const cacheKey = `odds:${fixtureId}:${BET365_BOOKMAKER_ID}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData) as OddsApiResponse);
    }

    // Dedupe concurrent cache misses for the same fixture within this
    // container. The second-and-later requests await the same promise.
    let pending = inflight.get(fixtureId);
    if (!pending) {
      pending = fetchOddsFromApi(fixtureId).finally(() => {
        // Clean up regardless of outcome so a transient failure doesn't
        // poison future requests for this fixture.
        inflight.delete(fixtureId);
      });
      inflight.set(fixtureId, pending);
    }

    const data = await pending;

    if (isRateLimitError(data)) {
      // Tell the client we're throttled but DON'T cache. The next
      // request after the per-minute window resets will succeed and
      // populate the cache normally.
      console.warn(
        `[odds] api-football rate limit hit for fixture ${fixtureId}`,
      );
      return NextResponse.json(data, { status: 429 });
    }

    // 30-minute TTL — odds move slowly relative to fixture status.
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

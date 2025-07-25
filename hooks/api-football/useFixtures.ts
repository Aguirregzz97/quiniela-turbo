import { useQuery } from "@tanstack/react-query";
import { FixturesApiResponse } from "@/types/fixtures";
import axios from "axios";

async function fetchFixtures(
  leagueId: string,
  season: string,
  fromDate?: string,
  toDate?: string,
): Promise<FixturesApiResponse> {
  try {
    console.log("Fetching fixtures data from API route");

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

    const response = await axios.get("/api/football/fixtures", {
      params,
    });

    return response.data as FixturesApiResponse;
  } catch (error) {
    console.error("Error fetching fixtures from API route:", error);

    // Fallback to static data if API route fails
    console.log("Falling back to static fixtures data");
    const fixturesData = await import("@/utils/sample_data/fixtures.json");
    return fixturesData.default as FixturesApiResponse;
  }
}

export function useFixtures(
  leagueId: string,
  season: string,
  fromDate?: string,
  toDate?: string,
) {
  return useQuery({
    queryKey: ["fixtures", leagueId, season, fromDate, toDate],
    queryFn: () => fetchFixtures(leagueId, season, fromDate, toDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    enabled: !!leagueId && !!season, // Only run query if we have required params
  });
}

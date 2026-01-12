import { useQuery } from "@tanstack/react-query";
import { OddsApiResponse } from "@/types/odds";
import axios from "axios";

async function fetchOdds(fixtureId: number): Promise<OddsApiResponse> {
  try {
    console.log("Fetching odds data from API route for fixture:", fixtureId);

    const response = await axios.get("/api/football/odds", {
      params: {
        fixture: fixtureId,
      },
    });

    return response.data as OddsApiResponse;
  } catch (error) {
    console.error("Error fetching odds from API route:", error);
    throw error;
  }
}

export function useOdds(fixtureId: number | undefined) {
  return useQuery({
    queryKey: ["odds", fixtureId],
    queryFn: () => fetchOdds(fixtureId!),
    staleTime: 30 * 60 * 1000, // 30 minutes - odds don't change as frequently
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!fixtureId, // Only run query if we have a fixture ID
  });
}

// Hook to fetch odds for multiple fixtures at once
export function useMultipleOdds(fixtureIds: number[]) {
  return useQuery({
    queryKey: ["odds-multiple", fixtureIds.sort().join(",")],
    queryFn: async () => {
      const results: Record<number, OddsApiResponse> = {};

      // Fetch odds for each fixture in parallel
      const promises = fixtureIds.map(async (id) => {
        try {
          const data = await fetchOdds(id);
          results[id] = data;
        } catch (error) {
          console.error(`Error fetching odds for fixture ${id}:`, error);
          // Don't fail the whole query if one fixture fails
        }
      });

      await Promise.all(promises);
      return results;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    enabled: fixtureIds.length > 0,
  });
}



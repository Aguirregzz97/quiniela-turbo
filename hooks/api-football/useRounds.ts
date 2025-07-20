import { useQuery } from "@tanstack/react-query";
import { RoundsApiResponse } from "@/types/rounds";
import axios from "axios";

async function fetchRounds(
  leagueId?: string,
  season?: string,
): Promise<RoundsApiResponse> {
  const currentYear = new Date().getFullYear().toString();
  const finalLeagueId = leagueId || "262";
  const finalSeason = season || currentYear;

  try {
    console.log("Fetching rounds data from API route");

    const response = await axios.get("/api/football/rounds", {
      params: {
        league: finalLeagueId,
        season: finalSeason,
      },
    });

    return response.data as RoundsApiResponse;
  } catch (error) {
    console.error("Error fetching rounds from API route:", error);

    // Fallback to static data if API route fails
    console.log("Falling back to static rounds data");
    const roundsData = await import("@/utils/sample_data/rounds.json");
    return roundsData.default as RoundsApiResponse;
  }
}

export function useRounds(leagueId?: string, season?: string) {
  return useQuery({
    queryKey: ["rounds", leagueId, season],
    queryFn: () => fetchRounds(leagueId, season),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

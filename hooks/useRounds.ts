import { useQuery } from "@tanstack/react-query";
import { RoundsApiResponse } from "@/types/rounds";

async function fetchRounds(
  leagueId?: string,
  season?: string,
): Promise<RoundsApiResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // For now, we'll read from the static JSON file
  // In the future, this would be a real API call:
  // const response = await fetch(`/api/rounds?league=${leagueId}&season=${season}`);
  // return response.json();

  // Import the mock data from the existing JSON file
  const roundsData = await import("@/utils/sample_data/rounds.json");
  return roundsData.default as RoundsApiResponse;
}

export function useRounds(leagueId?: string, season?: string) {
  return useQuery({
    queryKey: ["rounds", leagueId, season],
    queryFn: () => fetchRounds(leagueId, season),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
  });
}

import { useQuery } from "@tanstack/react-query";
import { SurvivorGamePick } from "@/db/schema";

async function fetchSurvivorPicks(
  survivorGameId: string,
): Promise<SurvivorGamePick[]> {
  const response = await fetch(
    `/api/survivor/${survivorGameId}/picks`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch survivor picks");
  }

  return response.json();
}

export function useSurvivorPicks(survivorGameId: string) {
  return useQuery({
    queryKey: ["survivor-picks", survivorGameId],
    queryFn: () => fetchSurvivorPicks(survivorGameId),
    enabled: !!survivorGameId,
  });
}


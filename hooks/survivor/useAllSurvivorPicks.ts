import { useQuery } from "@tanstack/react-query";

export interface SurvivorPickWithUser {
  id: string;
  survivorGameId: string;
  userId: string;
  externalFixtureId: string;
  externalRound: string;
  externalPickedTeamId: string;
  externalPickedTeamName: string;
  createdAt: string;
  userName: string | null;
  userImage: string | null;
}

export function useAllSurvivorPicks(survivorGameId: string) {
  return useQuery({
    queryKey: ["survivor-all-picks", survivorGameId],
    queryFn: async (): Promise<SurvivorPickWithUser[]> => {
      const response = await fetch(`/api/survivor/${survivorGameId}/all-picks`);
      if (!response.ok) {
        throw new Error("Failed to fetch survivor picks");
      }
      return response.json();
    },
    enabled: !!survivorGameId,
  });
}


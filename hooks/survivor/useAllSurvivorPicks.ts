import { useQuery } from "@tanstack/react-query";

export interface SurvivorPickWithUser {
  id: string;
  survivorGameId: string;
  oderId: string; // userId alias for consistency with other components
  externalFixtureId: string;
  externalRound: string;
  externalPickedTeamId: string;
  externalPickedTeamName: string | null;
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
      const data = await response.json();
      // Map userId to oderId for consistency with other components
      return data.map((pick: { userId: string } & Omit<SurvivorPickWithUser, 'oderId'>) => ({
        ...pick,
        oderId: pick.userId,
      }));
    },
    enabled: !!survivorGameId,
  });
}


import { useMemo } from "react";
import { useFixtures } from "./useFixtures";
import { TournamentType, fixtureMatchesTournament } from "@/lib/tournament";

export function useTournamentFixtures(
  leagueId: string,
  season: string,
  tournamentType: TournamentType,
) {
  const query = useFixtures(leagueId, season);

  const tournamentFixtures = useMemo(() => {
    if (!query.data?.response) return [];
    return query.data.response.filter((fixture) =>
      fixtureMatchesTournament(fixture, tournamentType),
    );
  }, [query.data?.response, tournamentType]);

  return {
    ...query,
    tournamentFixtures,
  };
}

import {
  FixtureData,
  getTeamResultFromTeam,
  isMatchFinished,
} from "@/types/fixtures";

export type TournamentType = "Clausura" | "Apertura" | null;

export function getTournamentType(roundName: string): TournamentType {
  if (roundName.includes("Clausura")) return "Clausura";
  if (roundName.includes("Apertura")) return "Apertura";
  return null;
}

export function fixtureMatchesTournament(
  fixture: FixtureData,
  tournamentType: TournamentType,
): boolean {
  if (!tournamentType) return true;
  return fixture.league.round.includes(tournamentType);
}

export function filterFixturesByRound(
  fixtures: FixtureData[] | undefined,
  roundName: string,
): FixtureData[] {
  if (!fixtures) return [];
  return fixtures.filter((fixture) => fixture.league.round === roundName);
}

function getTeamResult(
  fixture: FixtureData,
  teamId: number,
): "win" | "draw" | "loss" | null {
  const { teams } = fixture;
  const isHomeTeam = teams.home.id === teamId;
  const team = isHomeTeam ? teams.home : teams.away;
  return getTeamResultFromTeam(team);
}

/**
 * Get the last N finished results for a team from a list of fixtures.
 * Returns results in chronological order (oldest first), padded with nulls.
 */
export function getTeamLastResults(
  fixtures: FixtureData[],
  teamId: number,
  count: number = 5,
): ("win" | "draw" | "loss" | null)[] {
  const teamFinishedFixtures = fixtures
    .filter((fixture) => {
      const isTeamPlaying =
        fixture.teams.home.id === teamId || fixture.teams.away.id === teamId;
      return isTeamPlaying && isMatchFinished(fixture.fixture.status.short);
    })
    .sort(
      (a, b) =>
        new Date(b.fixture.date).getTime() -
        new Date(a.fixture.date).getTime(),
    )
    .slice(0, count);

  const results = teamFinishedFixtures
    .map((fixture) => getTeamResult(fixture, teamId))
    .reverse();

  while (results.length < count) {
    results.unshift(null);
  }

  return results;
}

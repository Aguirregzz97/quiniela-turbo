import {
  FixtureData,
  getTeamResultFromTeam,
  isMatchFinished,
} from "@/types/fixtures";

export type TournamentType = "Clausura" | "Apertura" | null;

export interface TeamStanding {
  teamId: number;
  teamName: string;
  teamLogo: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  last5: ("win" | "draw" | "loss" | null)[];
}

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

export function computeStandings(fixtures: FixtureData[]): TeamStanding[] {
  const standingsMap = new Map<number, Omit<TeamStanding, "last5">>();

  const finishedFixtures = fixtures.filter((f) =>
    isMatchFinished(f.fixture.status.short),
  );

  for (const fixture of finishedFixtures) {
    const homeTeam = fixture.teams.home;
    const awayTeam = fixture.teams.away;
    const homeGoals = fixture.goals.home ?? 0;
    const awayGoals = fixture.goals.away ?? 0;

    if (!standingsMap.has(homeTeam.id)) {
      standingsMap.set(homeTeam.id, {
        teamId: homeTeam.id,
        teamName: homeTeam.name,
        teamLogo: homeTeam.logo,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    }

    if (!standingsMap.has(awayTeam.id)) {
      standingsMap.set(awayTeam.id, {
        teamId: awayTeam.id,
        teamName: awayTeam.name,
        teamLogo: awayTeam.logo,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    }

    const home = standingsMap.get(homeTeam.id)!;
    const away = standingsMap.get(awayTeam.id)!;

    home.played++;
    away.played++;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (homeGoals < awayGoals) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      home.points += 1;
      away.draws++;
      away.points += 1;
    }
  }

  const standings: TeamStanding[] = Array.from(standingsMap.values()).map(
    (team) => ({
      ...team,
      goalDifference: team.goalsFor - team.goalsAgainst,
      last5: getTeamLastResults(fixtures, team.teamId, 5),
    }),
  );

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  return standings;
}

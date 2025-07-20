export interface FixtureVenue {
  id: number;
  name: string;
  city: string;
}

export interface FixturePeriods {
  first: number;
  second: number;
}

export interface FixtureStatus {
  long: string;
  short: string;
  elapsed: number;
  extra: number | null;
}

export interface Fixture {
  id: number;
  referee: string;
  timezone: string;
  date: string;
  timestamp: number;
  periods: FixturePeriods;
  venue: FixtureVenue;
  status: FixtureStatus;
}

export interface League {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string;
  season: number;
  round: string;
  standings: boolean;
}

export interface Team {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface Teams {
  home: Team;
  away: Team;
}

export interface Goals {
  home: number;
  away: number;
}

export interface ScoreTime {
  home: number | null;
  away: number | null;
}

export interface Score {
  halftime: ScoreTime;
  fulltime: ScoreTime;
  extratime: ScoreTime;
  penalty: ScoreTime;
}

export interface FixtureData {
  fixture: Fixture;
  league: League;
  teams: Teams;
  goals: Goals;
  score: Score;
}

export interface FixturePaging {
  current: number;
  total: number;
}

export interface FixtureParameters {
  league: string;
  season: string;
  team: string;
}

export interface FixturesApiResponse {
  get: string;
  parameters: FixtureParameters;
  errors: any[];
  results: number;
  paging: FixturePaging;
  response: FixtureData[];
}

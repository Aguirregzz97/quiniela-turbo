export interface FixtureVenue {
  id: number;
  name: string;
  city: string;
}

export interface FixturePeriods {
  first: number;
  second: number;
}

// Short fixture status codes from API-Football
export type ShortFixtureStatus =
  | "TBD" // Time To Be Defined - Scheduled but date and time are not known
  | "NS" // Not Started - Scheduled
  | "1H" // First Half, Kick Off - In Play
  | "HT" // Halftime - In Play
  | "2H" // Second Half, 2nd Half Started - In Play
  | "ET" // Extra Time - In Play
  | "BT" // Break Time - In Play (break during extra time)
  | "P" // Penalty In Progress - In Play
  | "SUSP" // Match Suspended - In Play
  | "INT" // Match Interrupted - In Play
  | "FT" // Match Finished - Finished in regular time
  | "AET" // Match Finished - Finished after extra time
  | "PEN" // Match Finished - Finished after penalty shootout
  | "PST" // Match Postponed - Postponed to another day
  | "CANC" // Match Cancelled - Match will not be played
  | "ABD" // Match Abandoned - Abandoned for various reasons
  | "AWD" // Technical Loss - Not Played
  | "WO" // WalkOver - Victory by forfeit
  | "LIVE"; // In Progress - Rare case, no half-time or elapsed time data

// Statuses that indicate a match has finished
export const FINISHED_STATUSES: ShortFixtureStatus[] = ["FT", "AET", "PEN"];

// Helper function to check if a match is finished
export function isMatchFinished(status: ShortFixtureStatus | string): boolean {
  return FINISHED_STATUSES.includes(status as ShortFixtureStatus);
}

export interface FixtureStatus {
  long: string;
  short: ShortFixtureStatus;
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

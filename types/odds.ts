import { StringValidation } from "zod";
import { Fixture, League } from "./fixtures";

export interface OddsParameters {
  fixture: number;
  bookmaker: number;
}

export interface OddsPaging {
  current: number;
  total: number;
}

export interface Value {
  value: string;
  odd: string;
}

export interface Bet {
  id: number;
  name: string;
  values: Value[];
}

export interface Bookmaker {
  id: number;
  name: string;
  bets: Bet[];
}

export interface OddsData {
  league: League;
  fixture: Fixture;
  bookmakers: Bookmaker[];
}
export interface OddsApiResponse {
  get: string;
  parameters: OddsParameters;
  errors: any[];
  results: number;
  paging: OddsPaging;
  response: OddsData[];
}

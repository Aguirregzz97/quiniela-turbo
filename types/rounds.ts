export interface RoundData {
  round: string;
  dates: string[];
}

export interface RoundPaging {
  current: number;
  total: number;
}

export interface RoundParameters {
  league: string;
  season: string;
  dates: string;
}

export interface RoundsApiResponse {
  get: string;
  parameters: RoundParameters;
  errors: any[];
  results: number;
  paging: RoundPaging;
  response: RoundData[];
  currentTournament?: "apertura" | "clausura";
}

import type { RoundData, RoundsApiResponse } from "@/types/rounds";

export type LeagueId = "liga-mx" | "mundial-2026";

export interface StandingsGroup {
  /** Display name shown in the standings drawer (e.g. "Group A"). */
  name: string;
  /** api-football team ids that belong to this group. */
  teamIds: number[];
}

export interface LeagueConfig {
  id: LeagueId;
  name: string;
  externalLeagueId: string;
  imageSrc: string;
  imageAlt: string;
  seasonLabel: (season: string) => string;
  getDefaultSeason: () => string;
  // When true, only rounds whose earliest date is in the future are
  // selectable (subject to NEXT_PUBLIC_ALLOW_ALL_ROUNDS). Synthesized
  // elimination rounds (with empty dates) are always shown regardless.
  filterFutureRoundsOnly: boolean;
  // Returns the elimination rounds that should always be available for this
  // league. The form merges these with whatever the api-football /rounds
  // endpoint returns, deduping by round name so any rounds already published
  // by the API (with real dates) win over the synthesized placeholders.
  getEliminationRounds: (apiResponse?: RoundsApiResponse) => RoundData[];
  /**
   * Optional group breakdown for the standings drawer. Set this for leagues
   * that have a group stage (e.g. World Cup) so the drawer renders one
   * mini-table per group instead of a single league-wide table.
   */
  standingsGroups?: StandingsGroup[];
  /**
   * Whether a given round name belongs to the regular/group stage. The
   * standings drawer uses this to exclude knockout fixtures (Quarter-finals,
   * Round of 32, etc.) from the table calculations — playoff games
   * shouldn't move teams up or down the regular-season standings.
   */
  isRegularSeasonRound: (roundName: string) => boolean;
}

const getLigaMXSeason = (): string => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month < 5 ? (year - 1).toString() : year.toString();
};

// Determine the active Liga MX tournament. Prefer the API's own detection
// (which inspects the rounds' dates); fall back to a month-based heuristic
// when we only have the static sample data.
function detectLigaMXTournament(
  apiResponse?: RoundsApiResponse,
): "Apertura" | "Clausura" {
  const fromApi = apiResponse?.currentTournament;
  if (fromApi === "apertura") return "Apertura";
  if (fromApi === "clausura") return "Clausura";

  // Apertura runs roughly Jul-Dec, Clausura Jan-Jun.
  const month = new Date().getMonth();
  return month >= 6 ? "Apertura" : "Clausura";
}

const LIGA_MX_ELIMINATION_SUFFIXES = ["Quarter-finals", "Semi-finals", "Final"];

const WORLD_CUP_2026_ELIMINATION_ROUNDS: RoundData[] = [
  { round: "Round of 32", dates: [] },
  { round: "Round of 16", dates: [] },
  { round: "Quarter-finals", dates: [] },
  { round: "Semi-finals", dates: [] },
  { round: "3rd Place Final", dates: [] },
  { round: "Final", dates: [] },
];

// World Cup 2026 group breakdown. Team ids are api-football's; verified
// against the /teams?league=1&season=2026 response. 12 groups of 4 = 48
// teams, matching the expanded format.
const WORLD_CUP_2026_GROUPS: StandingsGroup[] = [
  { name: "Group A", teamIds: [16, 1531, 17, 770] },
  { name: "Group B", teamIds: [5529, 1113, 1569, 15] },
  { name: "Group C", teamIds: [6, 31, 2386, 1108] },
  { name: "Group D", teamIds: [2384, 2380, 20, 777] },
  { name: "Group E", teamIds: [25, 5530, 1501, 2382] },
  { name: "Group F", teamIds: [1118, 12, 5, 28] },
  { name: "Group G", teamIds: [1, 32, 22, 4673] },
  { name: "Group H", teamIds: [9, 1533, 23, 7] },
  { name: "Group I", teamIds: [2, 13, 1567, 1090] },
  { name: "Group J", teamIds: [26, 1532, 775, 1548] },
  { name: "Group K", teamIds: [27, 1508, 1568, 8] },
  { name: "Group L", teamIds: [10, 3, 1504, 11] },
];

export const LEAGUES: LeagueConfig[] = [
  {
    id: "liga-mx",
    name: "Liga MX",
    externalLeagueId: "262",
    imageSrc: "https://media.api-sports.io/football/leagues/262.png",
    imageAlt: "Liga MX",
    seasonLabel: (season) => `Temporada ${season}`,
    getDefaultSeason: getLigaMXSeason,
    filterFutureRoundsOnly: true,
    getEliminationRounds: (apiResponse) => {
      const tournament = detectLigaMXTournament(apiResponse);
      return LIGA_MX_ELIMINATION_SUFFIXES.map((suffix) => ({
        round: `${tournament} - ${suffix}`,
        dates: [],
      }));
    },
    // Liga MX regular-season rounds look like "Apertura - 1" or
    // "Clausura - 17". Anything else (Quarter-finals, Semi-finals, Final,
    // Play-In rounds, with or without the tournament prefix) is a playoff.
    isRegularSeasonRound: (roundName) =>
      /^(Apertura|Clausura) - \d+$/.test(roundName),
  },
  {
    id: "mundial-2026",
    name: "Mundial 2026",
    externalLeagueId: "1",
    imageSrc: "https://media.api-sports.io/football/leagues/1.png",
    imageAlt: "Mundial 2026",
    seasonLabel: () => "Copa del Mundo 2026",
    getDefaultSeason: () => "2026",
    filterFutureRoundsOnly: false,
    getEliminationRounds: () => WORLD_CUP_2026_ELIMINATION_ROUNDS,
    standingsGroups: WORLD_CUP_2026_GROUPS,
    // World Cup regular-season rounds are the three group stage match
    // days. Round of 32 / 16, Quarter-finals, Semi-finals, 3rd Place
    // Final and Final are knockouts and excluded from group standings.
    isRegularSeasonRound: (roundName) => roundName.startsWith("Group Stage"),
  },
];

export function getLeagueByExternalId(
  externalLeagueId: string,
): LeagueConfig | undefined {
  return LEAGUES.find((l) => l.externalLeagueId === externalLeagueId);
}

export function getLeagueByName(name: string): LeagueConfig | undefined {
  return LEAGUES.find((l) => l.name === name);
}

/**
 * Merges the rounds returned by the api-football /rounds endpoint with the
 * elimination rounds that the league expects to exist. Rounds returned by
 * the API win over synthesized placeholders (so once the elimination bracket
 * is published with real dates, those dates show up automatically).
 */
export function mergeRoundsWithEliminationRounds(
  league: LeagueConfig,
  apiResponse?: RoundsApiResponse,
): RoundData[] {
  const apiRounds = apiResponse?.response ?? [];
  const apiRoundNames = new Set(apiRounds.map((r) => r.round));

  const eliminationRounds = league
    .getEliminationRounds(apiResponse)
    .filter((r) => !apiRoundNames.has(r.round));

  return [...apiRounds, ...eliminationRounds];
}

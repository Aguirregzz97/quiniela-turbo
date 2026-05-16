/**
 * Extracts the date range from quiniela roundsSelected data.
 * Returns the earliest date among the first rounds with dates, and the
 * latest date among the last rounds with dates.
 *
 * Rounds with an empty `dates` array (e.g. elimination rounds whose
 * bracket hasn't been published yet) are skipped from both ends so they
 * don't collapse the range to `null` and force a full-season fetch.
 */
export function getDateRangeFromRounds(
  roundsSelected: { roundName: string; dates: string[] }[],
): { fromDate: string | null; toDate: string | null } {
  if (!roundsSelected || roundsSelected.length === 0) {
    return { fromDate: null, toDate: null };
  }

  // First round (in order) that has at least one date.
  let fromDate: string | null = null;
  for (const round of roundsSelected) {
    if (round.dates && round.dates.length > 0) {
      fromDate = round.dates[0];
      break;
    }
  }

  // Last round (in reverse order) that has at least one date.
  let toDate: string | null = null;
  for (let i = roundsSelected.length - 1; i >= 0; i--) {
    const round = roundsSelected[i];
    if (round.dates && round.dates.length > 0) {
      toDate = round.dates[round.dates.length - 1];
      break;
    }
  }

  return { fromDate, toDate };
}

/**
 * Helper function to use with useFixtures hook for a specific quiniela
 */
export function getFixturesParamsFromQuiniela(quiniela: {
  externalLeagueId: string;
  externalSeason: string;
  roundsSelected: { roundName: string; dates: string[] }[];
}) {
  const { fromDate, toDate } = getDateRangeFromRounds(quiniela.roundsSelected);

  return {
    leagueId: quiniela.externalLeagueId,
    season: quiniela.externalSeason,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };
}

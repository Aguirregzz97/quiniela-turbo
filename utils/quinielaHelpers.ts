/**
 * Extracts the date range from quiniela roundsSelected data
 * Returns the first date from the first round and the last date from the last round
 */
export function getDateRangeFromRounds(
  roundsSelected: { roundName: string; dates: string[] }[],
): { fromDate: string | null; toDate: string | null } {
  if (!roundsSelected || roundsSelected.length === 0) {
    return { fromDate: null, toDate: null };
  }

  // Get the first date from the first round
  const firstRound = roundsSelected[0];
  const firstDate =
    firstRound.dates && firstRound.dates.length > 0
      ? firstRound.dates[0]
      : null;

  // Get the last date from the last round
  const lastRound = roundsSelected[roundsSelected.length - 1];
  const lastDate =
    lastRound.dates && lastRound.dates.length > 0
      ? lastRound.dates[lastRound.dates.length - 1]
      : null;

  return {
    fromDate: firstDate,
    toDate: lastDate,
  };
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

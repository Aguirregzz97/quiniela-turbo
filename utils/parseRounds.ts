import {
  ExternalRoundItem,
  ParsedRound,
  RoundType,
  Season,
  GroupedRounds,
  RoundStats,
  DateRange,
} from "@/types/ExternalRounds";

/**
 * Parses a round item with dates into structured round data
 * @param roundItem - The round item object with round name and dates
 * @returns ParsedRound object or null if parsing fails
 */
export function parseRoundItem(
  roundItem: ExternalRoundItem,
): ParsedRound | null {
  const { round: roundName, dates: dateStrings } = roundItem;
  const trimmed = roundName.trim();

  // Match pattern: "Season - Round"
  const match = trimmed.match(/^(Apertura|Clausura)\s*-\s*(.+)$/);

  if (!match) {
    return null;
  }

  const [, season, roundPart] = match;
  const seasonTyped = season as Season;

  // Parse dates
  const dates = dateStrings
    .map((dateStr) => new Date(dateStr))
    .filter((date) => !isNaN(date.getTime()));

  // Check if it's a numbered round (regular season)
  const numberMatch = roundPart.match(/^(\d+)$/);
  if (numberMatch) {
    return {
      season: seasonTyped,
      type: "regular",
      number: parseInt(numberMatch[1], 10),
      name: `Round ${numberMatch[1]}`,
      originalName: roundName,
      dates,
    };
  }

  // Check playoff rounds
  const playoffRounds: Record<string, RoundType> = {
    Reclasificación: "playoff",
    Reclasificacion: "playoff", // Alternative spelling
    "Quarter-finals": "playoff",
    "Semi-finals": "playoff",
    Finals: "final",
  };

  const roundType = playoffRounds[roundPart];
  if (roundType) {
    return {
      season: seasonTyped,
      type: roundType,
      name: roundPart,
      originalName: roundName,
      dates,
    };
  }

  // Fallback for unrecognized patterns
  return {
    season: seasonTyped,
    type: "regular",
    name: roundPart,
    originalName: roundName,
    dates,
  };
}

/**
 * Groups rounds by season
 * @param rounds - Array of round items
 * @returns Object with Apertura and Clausura arrays
 */
export function groupRoundsBySeason(
  rounds: ExternalRoundItem[],
): GroupedRounds {
  const grouped: GroupedRounds = {
    Apertura: [],
    Clausura: [],
  };

  rounds.forEach((roundItem) => {
    const parsed = parseRoundItem(roundItem);
    if (parsed) {
      grouped[parsed.season].push(parsed);
    }
  });

  return grouped;
}

/**
 * Filters rounds by type
 * @param rounds - Array of round items
 * @param type - Round type to filter by
 * @returns Array of matching parsed rounds
 */
export function filterRoundsByType(
  rounds: ExternalRoundItem[],
  type: RoundType,
): ParsedRound[] {
  return rounds
    .map(parseRoundItem)
    .filter(
      (round): round is ParsedRound => round !== null && round.type === type,
    );
}

/**
 * Sorts rounds in logical order (regular season first, then playoffs)
 * @param parsedRounds - Array of parsed rounds
 * @returns Sorted array
 */
export function sortRounds(parsedRounds: ParsedRound[]): ParsedRound[] {
  return parsedRounds.sort((a, b) => {
    // First sort by type priority
    const typePriority = { regular: 0, playoff: 1, final: 2 };
    const typeDiff = typePriority[a.type] - typePriority[b.type];
    if (typeDiff !== 0) return typeDiff;

    // For regular season rounds, sort by number
    if (a.type === "regular" && b.type === "regular" && a.number && b.number) {
      return a.number - b.number;
    }

    // For rounds of same type, sort by earliest date
    if (a.dates.length > 0 && b.dates.length > 0) {
      return a.dates[0].getTime() - b.dates[0].getTime();
    }

    return 0;
  });
}

/**
 * Gets the date range for a set of rounds
 * @param rounds - Array of parsed rounds
 * @returns DateRange object with start and end dates
 */
export function getRoundDateRange(rounds: ParsedRound[]): DateRange | null {
  const allDates = rounds.flatMap((round) => round.dates);
  if (allDates.length === 0) return null;

  const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());

  return {
    start: sortedDates[0],
    end: sortedDates[sortedDates.length - 1],
  };
}

/**
 * Gets statistics for a set of rounds
 * @param rounds - Array of round items
 * @returns RoundStats object with various statistics
 */
export function getRoundStats(rounds: ExternalRoundItem[]): RoundStats {
  const parsedRounds = rounds
    .map(parseRoundItem)
    .filter((round): round is ParsedRound => round !== null);

  const regularSeasonRounds = parsedRounds.filter(
    (r) => r.type === "regular",
  ).length;
  const playoffRounds = parsedRounds.filter((r) => r.type === "playoff").length;
  const finalRounds = parsedRounds.filter((r) => r.type === "final").length;

  const dateRange = getRoundDateRange(parsedRounds);
  const totalMatches = parsedRounds.reduce(
    (sum, round) => sum + round.dates.length,
    0,
  );
  const averageMatchesPerRound =
    parsedRounds.length > 0 ? totalMatches / parsedRounds.length : 0;

  return {
    totalRounds: parsedRounds.length,
    regularSeasonRounds,
    playoffRounds,
    finalRounds,
    dateRange: dateRange || { start: new Date(), end: new Date() },
    averageMatchesPerRound: Math.round(averageMatchesPerRound * 100) / 100,
  };
}

/**
 * Finds rounds that contain a specific date
 * @param rounds - Array of round items
 * @param targetDate - Date to search for
 * @returns Array of rounds that include the target date
 */
export function findRoundsByDate(
  rounds: ExternalRoundItem[],
  targetDate: Date,
): ParsedRound[] {
  const targetDateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD format

  return rounds
    .filter((roundItem) => roundItem.dates.includes(targetDateStr))
    .map(parseRoundItem)
    .filter((round): round is ParsedRound => round !== null);
}

/**
 * Gets the next upcoming round based on current date
 * @param rounds - Array of round items
 * @param currentDate - Current date (defaults to now)
 * @returns Next upcoming round or null if none found
 */
export function getNextRound(
  rounds: ExternalRoundItem[],
  currentDate: Date = new Date(),
): ParsedRound | null {
  const parsedRounds = rounds
    .map(parseRoundItem)
    .filter((round): round is ParsedRound => round !== null);

  const upcomingRounds = parsedRounds
    .filter((round) => round.dates.some((date) => date > currentDate))
    .sort((a, b) => {
      const aNextDate = a.dates.find((date) => date > currentDate);
      const bNextDate = b.dates.find((date) => date > currentDate);
      if (!aNextDate || !bNextDate) return 0;
      return aNextDate.getTime() - bNextDate.getTime();
    });

  return upcomingRounds[0] || null;
}

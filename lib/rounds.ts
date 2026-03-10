import { MEXICO_CITY_TIMEZONE } from "@/lib/constants";

export interface RoundSelected {
  roundName: string;
  dates: string[];
}

/**
 * Determines the current/active round from a list of rounds.
 *
 * Logic:
 *   1. Iterate rounds in order.
 *   2. Return the first round whose last date (end date) is >= today,
 *      UNLESS the next round has already started (its first date <= today).
 *      This handles postponed matches that push a round's end date far
 *      into the future: if the next round is already underway we skip
 *      the "artificially extended" round.
 *   3. If every round's end date is in the past, return the last round.
 *
 * All date comparisons use the Mexico City timezone.
 */
export function getActiveRound(
  rounds: RoundSelected[],
): RoundSelected | null {
  if (!rounds.length) return null;

  const today = getTodayInMexicoCity();

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    if (round.dates.length === 0) continue;

    // End date of this round (match days are in YYYY-MM-DD format)
    const roundEndDate = round.dates[round.dates.length - 1];
    const roundEnd = new Date(roundEndDate + "T23:59:59");

    // This round still has a date today or in the future
    if (roundEnd >= today) {
      // Check whether the next round (with dates) has already started.
      // If so, a postponed match is artificially extending this round —
      // skip it and let the loop move to the next round.
      const nextRound = findNextRoundWithDates(rounds, i + 1);

      if (nextRound) {
        const nextRoundStart = new Date(nextRound.dates[0] + "T00:00:00");
        if (nextRoundStart <= today) {
          // Next round has already begun — skip this round
          continue;
        }
      }

      return round;
    }
  }

  // All rounds have ended — return the last round
  return rounds[rounds.length - 1];
}

/**
 * Client-friendly wrapper that returns just the round name string.
 * Used by client components that need a default value for useState.
 */
export function getDefaultActiveRound(
  rounds: RoundSelected[],
): string {
  if (!rounds.length) return "";

  const activeRound = getActiveRound(rounds);
  return activeRound?.roundName ?? rounds[rounds.length - 1].roundName;
}

// ──────────────────── Internal helpers ────────────────────

function getTodayInMexicoCity(): Date {
  const now = new Date();
  const mexicoCityDate = now.toLocaleDateString("en-CA", {
    timeZone: MEXICO_CITY_TIMEZONE,
  }); // Returns YYYY-MM-DD format
  return new Date(mexicoCityDate + "T00:00:00");
}

function findNextRoundWithDates(
  rounds: RoundSelected[],
  startIndex: number,
): RoundSelected | null {
  for (let i = startIndex; i < rounds.length; i++) {
    if (rounds[i].dates.length > 0) return rounds[i];
  }
  return null;
}


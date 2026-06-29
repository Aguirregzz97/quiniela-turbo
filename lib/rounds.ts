import { MEXICO_CITY_TIMEZONE } from "@/lib/constants";
import type { FixtureData } from "@/types/fixtures";

export interface RoundSelected {
  roundName: string;
  dates: string[];
}

/**
 * Lightweight shape of an "any source of round metadata" entry. Both the
 * api-football /rounds response (`{ round, dates }`) and our stored
 * `quiniela.roundsSelected` entries (`{ roundName, dates }`) get normalized
 * through this when callers want to compare them.
 */

/**
 * Given a list of fixtures (typically the full season's fixtures from
 * api-football) and the rounds currently stored on a quiniela, return a new
 * list of rounds whose `dates` is the union of the stored dates and the
 * fixture-derived dates (in Mexico City timezone, YYYY-MM-DD, deduped,
 * sorted ascending).
 *
 * Returns `null` when no updates are needed, so callers can skip the DB
 * write / network call entirely.
 *
 * Why union and not replace:
 *   - We need to backfill rounds that started life empty (e.g. World Cup
 *     Round of 16 / Quarter-finals before the bracket is published).
 *   - We also need to *top up* rounds that were partially populated when
 *     api-football only had some fixtures published, then later got more.
 *     A real case: Round of 32 stored as `[2026-06-28]` because that's all
 *     api-football knew at quiniela creation; later the rest of the
 *     bracket arrives and we want to extend the round, not leave it
 *     stuck on one day.
 *   - We never remove a stored date here. If a match was rescheduled
 *     away from a date, that date stays in the round (harmless: it just
 *     widens the range a touch and never points to a real fixture).
 *     Reschedules are the rare case; backfills are the common one.
 */
export function computeRoundDateUpdates(
  storedRounds: RoundSelected[],
  fixtures: FixtureData[],
): RoundSelected[] | null {
  if (!storedRounds.length || !fixtures.length) return null;

  const datesByRound = groupFixtureDatesByRound(fixtures);

  let changed = false;
  const next = storedRounds.map((round) => {
    const fresh = datesByRound.get(round.roundName);
    if (!fresh || fresh.length === 0) return round;

    const merged = unionSorted(round.dates, fresh);
    if (merged.length === round.dates.length) {
      // No new dates discovered for this round.
      return round;
    }

    changed = true;
    return { ...round, dates: merged };
  });

  return changed ? next : null;
}

/**
 * Returns the sorted union of two YYYY-MM-DD string arrays. Both inputs
 * are assumed to be already sorted ascending, but we don't rely on it —
 * we just dedupe through a Set and re-sort.
 */
function unionSorted(a: string[], b: string[]): string[] {
  const set = new Set<string>(a);
  for (const v of b) set.add(v);
  return Array.from(set).sort();
}

function groupFixtureDatesByRound(
  fixtures: FixtureData[],
): Map<string, string[]> {
  const result = new Map<string, Set<string>>();

  for (const fixture of fixtures) {
    const roundName = fixture.league.round;
    if (!roundName) continue;

    const dateStr = toMexicoCityDateString(fixture.fixture.date);
    if (!dateStr) continue;

    const set = result.get(roundName) ?? new Set<string>();
    set.add(dateStr);
    result.set(roundName, set);
  }

  const sorted = new Map<string, string[]>();
  for (const [round, set] of result) {
    sorted.set(round, Array.from(set).sort());
  }
  return sorted;
}

function toMexicoCityDateString(isoDate: string): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { timeZone: MEXICO_CITY_TIMEZONE });
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
 *   3. If every dated round has ended, return the first round we know
 *      exists but have no dates for yet (e.g. World Cup Round of 16
 *      after Round of 32 finished but before the bracket is published).
 *      Defaulting to that "next upcoming" round is more useful than
 *      jumping all the way to the last round (Final) just because the
 *      intermediate rounds happen to be missing dates.
 *   4. As a last resort, return the last round.
 *
 * All date comparisons use the Mexico City timezone.
 */
export function getActiveRound(
  rounds: RoundSelected[],
): RoundSelected | null {
  if (!rounds.length) return null;

  const today = getTodayInMexicoCity();

  // Index of the last dated round we examined. Anything after this with
  // empty dates is a candidate for the "next upcoming" fallback below.
  let lastDatedIndex = -1;

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    if (round.dates.length === 0) continue;

    lastDatedIndex = i;

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

  // Every dated round has ended. Prefer the first *undated* round that
  // comes after the last dated one — that's the next round on the
  // bracket whose match dates haven't been published yet. Only fall
  // through to "the very last round" when there's no such candidate.
  for (let i = lastDatedIndex + 1; i < rounds.length; i++) {
    if (rounds[i].dates.length === 0) return rounds[i];
  }

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


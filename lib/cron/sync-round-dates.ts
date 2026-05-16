import { db } from "@/db";
import { quinielas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchFixtures } from "@/lib/api-football/fetchFixtures";
import { computeRoundDateUpdates } from "@/lib/rounds";
import type { FixtureData } from "@/types/fixtures";

export interface RoundDateSyncResult {
  quinielasChecked: number;
  quinielasUpdated: number;
  errors: number;
}

/**
 * Walks every quiniela that still has at least one round with empty
 * `dates` and tries to back-fill those dates from api-football's current
 * season fixtures. This complements the per-page client-side sync in
 * `RegistrarPronosticos`: it closes the window where api-football has
 * published a round (e.g. Mundial 2026 Round of 32) but no participant
 * has loaded the predictions page yet — without that, the cron's
 * `getActiveRound` would skip the empty round and miss reminders.
 *
 * Fetches the season schedule once per (leagueId, season) pair and
 * reuses the result across all quinielas in that pair to keep the
 * api-football call count low.
 *
 * Errors on a single quiniela are caught and reported; they don't stop
 * the rest of the sync from completing.
 */
export async function syncRoundDatesForAllQuinielas(): Promise<RoundDateSyncResult> {
  const result: RoundDateSyncResult = {
    quinielasChecked: 0,
    quinielasUpdated: 0,
    errors: 0,
  };

  const allQuinielas = await db
    .select({
      id: quinielas.id,
      externalLeagueId: quinielas.externalLeagueId,
      externalSeason: quinielas.externalSeason,
      roundsSelected: quinielas.roundsSelected,
    })
    .from(quinielas);

  // Only quinielas with at least one empty-dates round need a sync.
  const candidates = allQuinielas.filter((q) =>
    (q.roundsSelected || []).some((r) => !r.dates || r.dates.length === 0),
  );

  result.quinielasChecked = candidates.length;
  if (candidates.length === 0) return result;

  // Group by (leagueId, season) so we hit api-football once per pair.
  const groups = new Map<string, typeof candidates>();
  for (const q of candidates) {
    const key = `${q.externalLeagueId}:${q.externalSeason}`;
    const list = groups.get(key) ?? [];
    list.push(q);
    groups.set(key, list);
  }

  for (const [key, quinielasInGroup] of groups) {
    const [leagueId, season] = key.split(":");
    let fixtures: FixtureData[] = [];
    try {
      const data = await fetchFixtures({ leagueId, season });
      fixtures = data?.response ?? [];
    } catch (error) {
      console.error(
        `[syncRoundDatesForAllQuinielas] Failed to fetch fixtures for ${key}:`,
        error,
      );
      result.errors += quinielasInGroup.length;
      continue;
    }

    if (fixtures.length === 0) continue;

    for (const quiniela of quinielasInGroup) {
      try {
        const updated = computeRoundDateUpdates(
          quiniela.roundsSelected || [],
          fixtures,
        );
        if (!updated) continue;

        await db
          .update(quinielas)
          .set({ roundsSelected: updated, updatedAt: new Date() })
          .where(eq(quinielas.id, quiniela.id));

        result.quinielasUpdated++;
        console.log(
          `[syncRoundDatesForAllQuinielas] Updated round dates for quiniela ${quiniela.id}`,
        );
      } catch (error) {
        console.error(
          `[syncRoundDatesForAllQuinielas] Failed to update quiniela ${quiniela.id}:`,
          error,
        );
        result.errors++;
      }
    }
  }

  return result;
}

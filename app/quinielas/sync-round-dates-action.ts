"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { quinielas, quiniela_participants } from "@/db/schema";
import type { RoundSelected } from "@/lib/rounds";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

interface SyncResult {
  success: boolean;
  updated: boolean;
  message?: string;
}

/**
 * Updates a quiniela's `roundsSelected` with the provided dates. The caller
 * is expected to have already computed the diff (see `computeRoundDateUpdates`
 * in `lib/rounds.ts`) so this action is a small, focused write.
 *
 * Authorization: any participant of the quiniela may trigger the sync, so
 * that whoever opens the predictions page first (the owner included) can
 * pull in dates for newly-published rounds.
 *
 * Safety guards:
 *  - The shape of `updatedRounds` must match the existing rounds 1:1 by
 *    `roundName`, in order. We never add or remove rounds here — that's
 *    a quiniela edit, not a date sync.
 *  - We only persist if at least one round actually changed.
 */
export async function syncQuinielaRoundDates(
  quinielaId: string,
  updatedRounds: RoundSelected[],
): Promise<SyncResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, updated: false, message: "Unauthenticated" };
    }

    const [quiniela] = await db
      .select({
        id: quinielas.id,
        roundsSelected: quinielas.roundsSelected,
      })
      .from(quinielas)
      .where(eq(quinielas.id, quinielaId))
      .limit(1);

    if (!quiniela) {
      return { success: false, updated: false, message: "Quiniela not found" };
    }

    const [participant] = await db
      .select({ id: quiniela_participants.id })
      .from(quiniela_participants)
      .where(
        and(
          eq(quiniela_participants.quinielaId, quinielaId),
          eq(quiniela_participants.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!participant) {
      return {
        success: false,
        updated: false,
        message: "Not a participant of this quiniela",
      };
    }

    const stored = quiniela.roundsSelected ?? [];

    // Defensive: if shape no longer matches (round added/removed/reordered
    // upstream) bail out rather than corrupt the data.
    if (
      stored.length !== updatedRounds.length ||
      stored.some((r, i) => r.roundName !== updatedRounds[i]?.roundName)
    ) {
      return {
        success: false,
        updated: false,
        message: "Round list shape mismatch",
      };
    }

    // Merge by taking the sorted union of stored + incoming dates. Mirrors
    // `computeRoundDateUpdates`'s policy in `lib/rounds.ts` so two clients
    // racing to sync produce the same result, and a partially-populated
    // round (e.g. Round of 32 stored as a single day at quiniela creation)
    // gets topped up once api-football publishes the rest of its matches.
    let changed = false;
    const merged: RoundSelected[] = stored.map((round, i) => {
      const incoming = updatedRounds[i];
      if (!incoming.dates.length) return round;

      const union = new Set<string>(round.dates);
      for (const d of incoming.dates) union.add(d);

      if (union.size === round.dates.length) return round;

      changed = true;
      return {
        roundName: round.roundName,
        dates: Array.from(union).sort(),
      };
    });

    if (!changed) {
      return { success: true, updated: false };
    }

    await db
      .update(quinielas)
      .set({ roundsSelected: merged, updatedAt: new Date() })
      .where(eq(quinielas.id, quinielaId));

    // Revalidate every page that reads `roundsSelected` server-side so a
    // `router.refresh()` from any of them sees the new dates, not just
    // whichever page triggered the sync.
    revalidatePath(`/quinielas/${quinielaId}`);
    revalidatePath(`/quinielas/${quinielaId}/resultados-por-usuario`);
    revalidatePath(`/quinielas/${quinielaId}/resultados-por-partido`);
    revalidatePath(`/quinielas/${quinielaId}/registrar-pronosticos`);

    return { success: true, updated: true };
  } catch (error) {
    console.error("Error syncing quiniela round dates:", error);
    return {
      success: false,
      updated: false,
      message:
        error instanceof Error ? error.message : "Failed to sync round dates",
    };
  }
}

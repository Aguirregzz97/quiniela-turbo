"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { quinielas, quiniela_participants, predictions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fetchFixtures } from "@/lib/api-football/fetchFixtures";
import {
  isMatchFinished,
  isMatchLive,
  type FixtureData,
} from "@/types/fixtures";

export interface PredictionInput {
  externalFixtureId: string;
  externalRound: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
}

// Matches the client's `canPredictFixture`: predictions lock 5 minutes
// before kickoff.
const PREDICTION_LOCK_MS = 5 * 60 * 1000;
const MAX_SCORE = 99;

export async function savePredictions(
  quinielaId: string,
  predictionsData: PredictionInput[],
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("No autenticado");
    }
    const userId = session.user.id;

    if (predictionsData.length === 0) {
      return {
        success: false,
        message: "No hay pronósticos para guardar",
      };
    }

    // Make sure the quiniela exists and the caller is allowed to write to
    // it (owner or participant). Never trust the client to only send
    // quinielas the user belongs to.
    const [quiniela] = await db
      .select()
      .from(quinielas)
      .where(eq(quinielas.id, quinielaId))
      .limit(1);

    if (!quiniela) {
      return { success: false, message: "Quiniela no encontrada" };
    }

    let isMember = quiniela.ownerId === userId;
    if (!isMember) {
      const membership = await db
        .select({ id: quiniela_participants.id })
        .from(quiniela_participants)
        .where(
          and(
            eq(quiniela_participants.quinielaId, quinielaId),
            eq(quiniela_participants.userId, userId),
          ),
        )
        .limit(1);
      isMember = membership.length > 0;
    }

    if (!isMember) {
      return { success: false, message: "No perteneces a esta quiniela" };
    }

    // Pull the tournament fixtures (cached) so we can enforce the same
    // "match hasn't started" rule as the UI. If the API is unavailable we
    // fail open on the time check (to avoid blocking all saves during an
    // outage) but still enforce membership and score sanity below.
    const allowPredictionsIndefinitely =
      process.env.NEXT_PUBLIC_ALLOW_PREDICTIONS_IDEFINITELY === "true";

    const fixtureById = new Map<string, FixtureData>();
    if (!allowPredictionsIndefinitely) {
      const fixturesResp = await fetchFixtures({
        leagueId: quiniela.externalLeagueId,
        season: quiniela.externalSeason,
      });
      for (const f of fixturesResp?.response ?? []) {
        fixtureById.set(f.fixture.id.toString(), f);
      }
    }
    const fixturesAvailable = fixtureById.size > 0;

    const canPredictFixture = (fixture: FixtureData): boolean => {
      if (allowPredictionsIndefinitely) return true;
      const status = fixture.fixture.status.short;
      if (isMatchFinished(status) || isMatchLive(status)) return false;
      const kickoff = new Date(fixture.fixture.date).getTime();
      return kickoff - Date.now() > PREDICTION_LOCK_MS;
    };

    // Validate each prediction: valid integer scores in range, and the
    // match must still be open. Anything invalid is dropped rather than
    // failing the whole batch, so a legitimate client that raced past the
    // lock on one match still saves the rest.
    const valid: PredictionInput[] = [];
    let rejected = 0;

    for (const p of predictionsData) {
      const { predictedHomeScore: h, predictedAwayScore: a } = p;
      const scoresValid =
        Number.isInteger(h) &&
        Number.isInteger(a) &&
        h >= 0 &&
        a >= 0 &&
        h <= MAX_SCORE &&
        a <= MAX_SCORE;

      if (!scoresValid) {
        rejected++;
        continue;
      }

      if (fixturesAvailable) {
        const fixture = fixtureById.get(p.externalFixtureId);
        if (!fixture || !canPredictFixture(fixture)) {
          rejected++;
          continue;
        }
      }

      valid.push(p);
    }

    if (valid.length === 0) {
      return {
        success: false,
        message:
          "No se pudo guardar: los partidos ya comenzaron o los datos no son válidos",
      };
    }

    const validFixtureIds = valid.map((p) => p.externalFixtureId);

    // Delete existing predictions ONLY for the specific fixtures being
    // updated. This preserves predictions for games that have already
    // started (which we never re-write).
    await db
      .delete(predictions)
      .where(
        and(
          eq(predictions.quinielaId, quinielaId),
          eq(predictions.userId, userId),
          inArray(predictions.externalFixtureId, validFixtureIds),
        ),
      );

    const predictionRecords = valid.map((prediction) => ({
      quinielaId,
      userId,
      externalFixtureId: prediction.externalFixtureId,
      externalRound: prediction.externalRound,
      predictedHomeScore: prediction.predictedHomeScore,
      predictedAwayScore: prediction.predictedAwayScore,
    }));

    await db.insert(predictions).values(predictionRecords);

    revalidatePath(`/quinielas/${quinielaId}/registrar-pronosticos`);

    return {
      success: true,
      message:
        rejected > 0
          ? `${valid.length} pronósticos guardados (${rejected} no se guardaron porque el partido ya comenzó)`
          : `${valid.length} pronósticos guardados exitosamente`,
    };
  } catch (error) {
    console.error("Error saving predictions:", error);
    return {
      success: false,
      message: "Error al guardar los pronósticos",
    };
  }
}

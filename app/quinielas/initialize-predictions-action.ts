"use server";

import { db } from "@/db";
import { predictions, quinielas } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { fetchRoundFixtures } from "@/lib/api-football/fetchRoundFixtures";

interface RoundSelected {
  roundName: string;
  dates: string[];
}

/**
 * Initializes empty predictions for a user when they join a quiniela.
 * This ensures the user appears in results, leaderboards, and receives email reminders.
 * Predictions are created with null scores, which will be displayed as "pending" in the UI.
 */
export async function initializePredictionsForUser(
  quinielaId: string,
  userId: string,
) {
  try {
    // Get the quiniela data to access rounds and league info
    const quinielaData = await db
      .select()
      .from(quinielas)
      .where(eq(quinielas.id, quinielaId))
      .limit(1);

    if (!quinielaData.length) {
      console.error(
        `[initializePredictions] Quiniela not found: ${quinielaId}`,
      );
      return { success: false, error: "Quiniela not found" };
    }

    const quiniela = quinielaData[0];
    const roundsSelected = (quiniela.roundsSelected || []) as RoundSelected[];

    if (roundsSelected.length === 0) {
      console.log(
        `[initializePredictions] No rounds selected for quiniela: ${quinielaId}`,
      );
      return { success: true, predictionsCreated: 0 };
    }

    const predictionsToCreate: {
      quinielaId: string;
      userId: string;
      externalFixtureId: string;
      externalRound: string;
      predictedHomeScore: null;
      predictedAwayScore: null;
    }[] = [];

    // Fetch fixtures for each round and create prediction records
    for (const round of roundsSelected) {
      const fixtures = await fetchRoundFixtures(
        quiniela.externalLeagueId,
        quiniela.externalSeason,
        round.roundName,
      );

      for (const fixture of fixtures) {
        predictionsToCreate.push({
          quinielaId,
          userId,
          externalFixtureId: fixture.fixture.id.toString(),
          externalRound: round.roundName,
          predictedHomeScore: null,
          predictedAwayScore: null,
        });
      }
    }

    if (predictionsToCreate.length === 0) {
      console.log(
        `[initializePredictions] No fixtures found for quiniela: ${quinielaId}`,
      );
      return { success: true, predictionsCreated: 0 };
    }

    // Check for existing predictions to avoid duplicates
    const existingPredictions = await db
      .select({
        externalFixtureId: predictions.externalFixtureId,
        externalRound: predictions.externalRound,
      })
      .from(predictions)
      .where(
        and(
          eq(predictions.quinielaId, quinielaId),
          eq(predictions.userId, userId),
        ),
      );

    const existingKeys = new Set(
      existingPredictions.map((p) => `${p.externalFixtureId}-${p.externalRound}`),
    );

    // Filter out predictions that already exist
    const newPredictions = predictionsToCreate.filter(
      (p) => !existingKeys.has(`${p.externalFixtureId}-${p.externalRound}`),
    );

    if (newPredictions.length === 0) {
      console.log(
        `[initializePredictions] All predictions already exist for user ${userId} in quiniela ${quinielaId}`,
      );
      return { success: true, predictionsCreated: 0 };
    }

    // Insert new predictions in batches to avoid hitting database limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < newPredictions.length; i += BATCH_SIZE) {
      const batch = newPredictions.slice(i, i + BATCH_SIZE);
      await db.insert(predictions).values(batch);
    }

    console.log(
      `[initializePredictions] Created ${newPredictions.length} predictions for user ${userId} in quiniela ${quinielaId}`,
    );

    return { success: true, predictionsCreated: newPredictions.length };
  } catch (error) {
    console.error("[initializePredictions] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}


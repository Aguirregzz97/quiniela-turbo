"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { predictions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface PredictionInput {
  externalFixtureId: string;
  externalRound: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
}

export async function savePredictions(
  quinielaId: string,
  predictionsData: PredictionInput[],
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("No autenticado");
    }

    if (predictionsData.length === 0) {
      return {
        success: false,
        message: "No hay pronósticos para guardar",
      };
    }

    // Delete existing predictions for this round and user
    const firstPrediction = predictionsData[0];
    if (firstPrediction) {
      await db
        .delete(predictions)
        .where(
          and(
            eq(predictions.quinielaId, quinielaId),
            eq(predictions.userId, session.user.id),
            eq(predictions.externalRound, firstPrediction.externalRound),
          ),
        );
    }

    // Insert new predictions
    const predictionRecords = predictionsData.map((prediction) => ({
      quinielaId,
      userId: session.user.id,
      externalFixtureId: prediction.externalFixtureId,
      externalRound: prediction.externalRound,
      predictedHomeScore: prediction.predictedHomeScore,
      predictedAwayScore: prediction.predictedAwayScore,
    }));

    await db.insert(predictions).values(predictionRecords);

    // Revalidate the predictions page
    revalidatePath(`/quinielas/${quinielaId}/registrar-pronosticos`);

    return {
      success: true,
      message: `${predictionsData.length} pronósticos guardados exitosamente`,
    };
  } catch (error) {
    console.error("Error saving predictions:", error);
    return {
      success: false,
      message: "Error al guardar los pronósticos",
    };
  }
}

"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { predictions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import axios from "axios";

export interface PredictionInput {
  externalFixtureId: string;
  externalRound: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
}

// Helper function to check if a match has started
async function getMatchStatuses(
  fixtureIds: string[],
): Promise<Record<string, string>> {
  try {
    const apiUrl = process.env.FOOTBALL_API_URL;
    const apiKey = process.env.FOOTBALL_API_KEY;

    if (!apiUrl || !apiKey) {
      // If API is not available, allow predictions (fallback)
      const fallbackMap: Record<string, string> = {};
      fixtureIds.forEach((id) => {
        fallbackMap[id] = "NS";
      });
      return fallbackMap;
    }

    // Get fixture statuses from API
    const response = await axios.get(`${apiUrl}/fixtures`, {
      params: {
        ids: fixtureIds.join("-"),
      },
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": new URL(apiUrl).hostname,
      },
    });

    const statusMap: Record<string, string> = {};
    response.data.response?.forEach((fixture: any) => {
      statusMap[fixture.fixture.id.toString()] = fixture.fixture.status.short;
    });

    return statusMap;
  } catch (error) {
    console.error("Error fetching match statuses:", error);
    // If there's an error, allow predictions (fallback)
    const fallbackMap: Record<string, string> = {};
    fixtureIds.forEach((id) => {
      fallbackMap[id] = "NS";
    });
    return fallbackMap;
  }
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

    // Get match statuses to validate predictions
    const fixtureIds = predictionsData.map((p) => p.externalFixtureId);
    const matchStatuses = await getMatchStatuses(fixtureIds);

    // Filter out predictions for matches that have already started
    const validPredictions = predictionsData.filter((prediction) => {
      const status = matchStatuses[prediction.externalFixtureId];
      return status === "NS"; // Only allow predictions for "Not Started" matches
    });

    const invalidPredictions = predictionsData.filter((prediction) => {
      const status = matchStatuses[prediction.externalFixtureId];
      return status !== "NS";
    });

    if (validPredictions.length === 0) {
      return {
        success: false,
        message:
          "No se pueden guardar pronósticos para partidos que ya han comenzado",
      };
    }

    // Delete existing predictions for this round and user (only for valid predictions)
    const firstPrediction = validPredictions[0];
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

    // Insert new predictions (only valid ones)
    const predictionRecords = validPredictions.map((prediction) => ({
      quinielaId,
      userId: session.user.id,
      externalFixtureId: prediction.externalFixtureId,
      externalRound: prediction.externalRound,
      predictedHomeScore: prediction.predictedHomeScore,
      predictedAwayScore: prediction.predictedAwayScore,
    }));

    await db.insert(predictions).values(predictionRecords);

    // Revalidate the predictions page
    revalidatePath(`/quinielas/${quinielaId}/predictions`);

    // Prepare response message
    let message = `${validPredictions.length} pronósticos guardados exitosamente`;
    if (invalidPredictions.length > 0) {
      message += `. ${invalidPredictions.length} pronósticos omitidos (partidos ya iniciados)`;
    }

    return {
      success: true,
      message,
    };
  } catch (error) {
    console.error("Error saving predictions:", error);
    return {
      success: false,
      message: "Error al guardar los pronósticos",
    };
  }
}

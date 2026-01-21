"use server";

import { auth } from "@/auth";
import { CreateQuinielaFormData } from "@/components/QuinielaComponents/CreateQuinielaForm";
import { db } from "@/db";
import {
  quinielas,
  quiniela_settings,
  quiniela_participants,
  NewQuiniela,
  NewQuinielaSetting,
  NewQuinielaParticipant,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { initializePredictionsForUser } from "./initialize-predictions-action";

export async function createQuiniela(data: CreateQuinielaFormData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Validate input data
    if (!data.name || !data.description) {
      throw new Error("El nombre y descripción son requeridos");
    }

    if (!data.league || !data.externalLeagueId) {
      throw new Error("La liga es requerida");
    }

    // Validate at least one game mode is selected
    if (!data.playByTournament && !data.playByRound) {
      throw new Error("Debes seleccionar al menos un modo de juego");
    }

    // Create the quiniela data object
    const quinielaData: Pick<
      NewQuiniela,
      | "name"
      | "description"
      | "ownerId"
      | "league"
      | "externalLeagueId"
      | "externalSeason"
      | "roundsSelected"
    > = {
      name: data.name,
      description: data.description,
      ownerId: session.user.id,
      league: data.league,
      externalLeagueId: data.externalLeagueId,
      roundsSelected: data.roundsSelected,
      externalSeason: data.externalSeason,
    };

    // Create the quiniela in the database
    const newQuiniela = await db
      .insert(quinielas)
      .values(quinielaData)
      .returning();

    // Create the quiniela settings
    const quinielaSettingsData: Omit<
      NewQuinielaSetting,
      "id" | "createdAt" | "updatedAt"
    > = {
      quinielaId: newQuiniela[0].id,
      // Tournament-wide settings (only if playByTournament is enabled)
      moneyToEnter: data.playByTournament ? data.moneyToEnter : null,
      prizeDistribution: data.playByTournament ? data.prizeDistribution : null,
      // Per-round settings (only if playByRound is enabled)
      moneyPerRoundToEnter: data.playByRound ? data.moneyPerRoundToEnter : null,
      prizeDistributionPerRound: data.playByRound
        ? data.prizeDistributionPerRound
        : null,
      // Default settings
      allowEditPredictions: true,
      pointsForExactResultPrediction: data.pointsForExactResultPrediction,
      pointsForCorrectResultPrediction: data.pointsForCorrectResultPrediction,
    };

    await db.insert(quiniela_settings).values(quinielaSettingsData);

    // Create participant record for the creator
    const participantData: Omit<
      NewQuinielaParticipant,
      "id" | "createdAt" | "updatedAt"
    > = {
      quinielaId: newQuiniela[0].id,
      userId: session.user.id,
    };

    await db.insert(quiniela_participants).values(participantData);

    // Initialize empty predictions for the creator
    try {
      await initializePredictionsForUser(newQuiniela[0].id, session.user.id);
    } catch (err) {
      console.error("Error initializing predictions after create:", err);
      // Don't fail the creation if predictions initialization fails
    }

    // Revalidate the quinielas pages
    revalidatePath("/quinielas");

    return { quinielaId: newQuiniela[0].id };
  } catch (error) {
    console.error("Error creating quiniela:", error);
    throw new Error(
      error instanceof Error ? error.message : "Error al crear la quiniela"
    );
  }
}

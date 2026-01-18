"use server";

import { auth } from "@/auth";
import { CreateSurvivorFormData } from "@/components/SurvivorComponents/CreateSurvivorForm";
import { db } from "@/db";
import {
  survivor_games,
  survivor_game_participants,
  NewSurvivorGame,
  NewSurvivorGameParticipant,
} from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createSurvivorGame(data: CreateSurvivorFormData) {
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

    if (!data.roundsSelected || data.roundsSelected.length === 0) {
      throw new Error("Debe seleccionar al menos una jornada");
    }

    // Create the survivor game data object
    const survivorGameData: Pick<
      NewSurvivorGame,
      | "name"
      | "description"
      | "ownerId"
      | "league"
      | "externalLeagueId"
      | "externalSeason"
      | "roundsSelected"
      | "lives"
      | "moneyToEnter"
      | "prizeDistribution"
    > = {
      name: data.name,
      description: data.description,
      ownerId: session.user.id,
      league: data.league,
      externalLeagueId: data.externalLeagueId,
      externalSeason: data.externalSeason,
      roundsSelected: data.roundsSelected,
      lives: data.lives,
      moneyToEnter: data.moneyToEnter,
      prizeDistribution: data.prizeDistribution,
    };

    // Create the survivor game in the database
    const newSurvivorGame = await db
      .insert(survivor_games)
      .values(survivorGameData)
      .returning();

    // Create participant record for the creator with full lives
    const participantData: Omit<
      NewSurvivorGameParticipant,
      "id" | "createdAt" | "updatedAt"
    > = {
      survivorGameId: newSurvivorGame[0].id,
      userId: session.user.id,
    };

    await db.insert(survivor_game_participants).values(participantData);

    // Revalidate the survivor pages
    revalidatePath("/survivor");

    return { survivorGameId: newSurvivorGame[0].id };
  } catch (error) {
    console.error("Error creating survivor game:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Error al crear el juego de Survivor",
    );
  }
}


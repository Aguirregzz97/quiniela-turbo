"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  survivor_games,
  survivor_game_participants,
  NewSurvivorGameParticipant,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function joinSurvivorByCode(joinCode: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Find survivor game by join code
    const survivorGame = await db
      .select()
      .from(survivor_games)
      .where(eq(survivor_games.joinCode, joinCode))
      .limit(1);

    if (!survivorGame.length) {
      throw new Error("Código de unión inválido");
    }

    const survivorGameData = survivorGame[0];

    // Check if user is already a participant
    const existingParticipant = await db
      .select()
      .from(survivor_game_participants)
      .where(
        and(
          eq(survivor_game_participants.survivorGameId, survivorGameData.id),
          eq(survivor_game_participants.userId, session.user.id),
        ),
      );

    if (existingParticipant.length > 0) {
      throw new Error("Ya eres participante de este Survivor");
    }

    // Create participant record with full lives
    const participantData: Omit<
      NewSurvivorGameParticipant,
      "id" | "createdAt" | "updatedAt"
    > = {
      survivorGameId: survivorGameData.id,
      userId: session.user.id,
      livesRemaining: survivorGameData.lives,
      isEliminated: false,
      eliminatedAtRound: null,
    };

    await db.insert(survivor_game_participants).values(participantData);

    // Revalidate the survivor pages
    revalidatePath("/survivor");
    revalidatePath(`/survivor/${survivorGameData.id}`);

    return {
      success: true,
      survivorGameId: survivorGameData.id,
      survivorGameName: survivorGameData.name,
    };
  } catch (error) {
    console.error("Error joining survivor by code:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Error al unirse al juego de Survivor",
    );
  }
}


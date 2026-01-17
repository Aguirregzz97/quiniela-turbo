"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  survivor_games,
  survivor_game_participants,
  survivor_game_picks,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function kickSurvivorParticipant(
  survivorGameId: string,
  participantUserId: string,
) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
  }

  // Check if the current user is the owner of the survivor game
  const survivorGame = await db
    .select({ ownerId: survivor_games.ownerId })
    .from(survivor_games)
    .where(eq(survivor_games.id, survivorGameId))
    .limit(1);

  if (!survivorGame.length) {
    return { success: false, error: "Survivor no encontrado" };
  }

  if (survivorGame[0].ownerId !== session.user.id) {
    return {
      success: false,
      error: "Solo el propietario puede expulsar participantes",
    };
  }

  // Don't allow kicking the owner
  if (participantUserId === session.user.id) {
    return { success: false, error: "No puedes expulsarte a ti mismo" };
  }

  // Delete the participant's picks for this survivor game
  await db
    .delete(survivor_game_picks)
    .where(
      and(
        eq(survivor_game_picks.survivorGameId, survivorGameId),
        eq(survivor_game_picks.userId, participantUserId),
      ),
    );

  // Delete the participant
  await db
    .delete(survivor_game_participants)
    .where(
      and(
        eq(survivor_game_participants.survivorGameId, survivorGameId),
        eq(survivor_game_participants.userId, participantUserId),
      ),
    );

  revalidatePath(`/survivor/${survivorGameId}`);

  return { success: true };
}


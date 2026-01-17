"use server";

import { auth } from "@/auth";
import { UpdateSurvivorFormData } from "@/components/SurvivorComponents/EditSurvivorForm";
import { db } from "@/db";
import { survivor_games } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateSurvivorGame(
  survivorGameId: string,
  data: UpdateSurvivorFormData,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Validate input data
    if (!data.name || !data.description) {
      throw new Error("El nombre y descripción son requeridos");
    }

    // Check if user owns the survivor game
    const existingSurvivorGame = await db
      .select()
      .from(survivor_games)
      .where(eq(survivor_games.id, survivorGameId))
      .limit(1);

    if (!existingSurvivorGame.length) {
      throw new Error("Survivor no encontrado");
    }

    if (existingSurvivorGame[0].ownerId !== session.user.id) {
      throw new Error("No tienes permisos para editar este Survivor");
    }

    // Update the survivor game
    await db
      .update(survivor_games)
      .set({
        name: data.name,
        description: data.description,
        lives: data.lives,
        moneyToEnter: data.moneyToEnter,
        prizeDistribution: data.prizeDistribution,
        updatedAt: new Date(),
      })
      .where(eq(survivor_games.id, survivorGameId));

    // Revalidate the survivor pages
    revalidatePath("/survivor");
    revalidatePath(`/survivor/${survivorGameId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating survivor game:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Error al actualizar el Survivor",
    );
  }
}


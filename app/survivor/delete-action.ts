"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { survivor_games } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteSurvivorGame(survivorGameId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Verify the user is the owner of the survivor game
    const survivorGame = await db
      .select()
      .from(survivor_games)
      .where(eq(survivor_games.id, survivorGameId))
      .limit(1);

    if (!survivorGame.length) {
      throw new Error("Survivor no encontrado");
    }

    if (survivorGame[0].ownerId !== session.user.id) {
      throw new Error("No tienes permiso para eliminar este Survivor");
    }

    // Delete the survivor game (cascade will handle participants and picks)
    await db.delete(survivor_games).where(eq(survivor_games.id, survivorGameId));

    // Revalidate the survivor page
    revalidatePath("/survivor");

    return { success: true };
  } catch (error) {
    console.error("Error deleting survivor game:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Error al eliminar el Survivor",
    );
  }
}


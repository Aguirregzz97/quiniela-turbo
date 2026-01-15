"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { quinielas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteQuiniela(quinielaId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Verify the user is the owner of the quiniela
    const quiniela = await db
      .select()
      .from(quinielas)
      .where(eq(quinielas.id, quinielaId))
      .limit(1);

    if (!quiniela.length) {
      throw new Error("Quiniela no encontrada");
    }

    if (quiniela[0].ownerId !== session.user.id) {
      throw new Error("No tienes permiso para eliminar esta quiniela");
    }

    // Delete the quiniela (cascade will handle participants, settings, and predictions)
    await db.delete(quinielas).where(eq(quinielas.id, quinielaId));

    // Revalidate the quinielas page
    revalidatePath("/quinielas");

    return { success: true };
  } catch (error) {
    console.error("Error deleting quiniela:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Error al eliminar la quiniela",
    );
  }
}


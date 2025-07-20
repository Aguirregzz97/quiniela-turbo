"use server";

import { auth } from "@/auth";
import { UpdateQuinielaFormData } from "@/components/QuinielaComponents/EditQuinielaForm";
import { db } from "@/db";
import { quinielas, quiniela_settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateQuiniela(
  quinielaId: string,
  data: UpdateQuinielaFormData,
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

    // Check if user owns the quiniela
    const existingQuiniela = await db
      .select()
      .from(quinielas)
      .where(eq(quinielas.id, quinielaId))
      .limit(1);

    if (!existingQuiniela.length) {
      throw new Error("Quiniela no encontrada");
    }

    if (existingQuiniela[0].ownerId !== session.user.id) {
      throw new Error("No tienes permisos para editar esta quiniela");
    }

    // Update the quiniela (only name and description)
    await db
      .update(quinielas)
      .set({
        name: data.name,
        description: data.description,
        updatedAt: new Date(),
      })
      .where(eq(quinielas.id, quinielaId));

    // Update the quiniela settings
    await db
      .update(quiniela_settings)
      .set({
        moneyToEnter: data.moneyToEnter,
        prizeDistribution: data.prizeDistribution,
        allowEditPredictions: data.allowEditPredictions,
        pointsForExactResultPrediction: data.pointsForExactResultPrediction,
        pointsForCorrectResultPrediction: data.pointsForCorrectResultPrediction,
        updatedAt: new Date(),
      })
      .where(eq(quiniela_settings.quinielaId, quinielaId));

    // Revalidate the quinielas pages
    revalidatePath("/quinielas");
    revalidatePath(`/quinielas/${quinielaId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating quiniela:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Error al actualizar la quiniela",
    );
  }
}

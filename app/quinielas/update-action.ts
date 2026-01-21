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

    // Validate at least one game mode is selected
    if (!data.playByTournament && !data.playByRound) {
      throw new Error(
        "Debe seleccionar al menos una modalidad de juego (por torneo o por jornada)"
      );
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

    // Build settings update object
    const settingsUpdate: Record<string, unknown> = {
      pointsForExactResultPrediction: data.pointsForExactResultPrediction,
      pointsForCorrectResultPrediction: data.pointsForCorrectResultPrediction,
      allowEditPredictions: true, // Always true now
      updatedAt: new Date(),
    };

    // Handle tournament mode settings
    if (data.playByTournament) {
      settingsUpdate.moneyToEnter = data.moneyToEnter;
      settingsUpdate.prizeDistribution = data.prizeDistribution;
    } else {
      // Clear tournament settings if mode is disabled
      settingsUpdate.moneyToEnter = null;
      settingsUpdate.prizeDistribution = null;
    }

    // Handle per-round mode settings
    if (data.playByRound) {
      settingsUpdate.moneyPerRoundToEnter = data.moneyPerRoundToEnter;
      settingsUpdate.prizeDistributionPerRound = data.prizeDistributionPerRound;
    } else {
      // Clear per-round settings if mode is disabled
      settingsUpdate.moneyPerRoundToEnter = null;
      settingsUpdate.prizeDistributionPerRound = null;
    }

    // Update the quiniela settings
    await db
      .update(quiniela_settings)
      .set(settingsUpdate)
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

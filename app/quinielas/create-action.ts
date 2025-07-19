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
import { redirect } from "next/navigation";

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

    // Create the quiniela data object
    const quinielaData: Pick<NewQuiniela, "name" | "description" | "ownerId"> =
      {
        name: data.name,
        description: data.description,
        ownerId: session.user.id,
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
      prizeDistribution: data.prizeDistribution,
      allowEditPredictions: data.allowEditPredictions,
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

    // Revalidate the quinielas pages
    revalidatePath("/quinielas");

    return { quinielaId: newQuiniela[0].id };
  } catch (error) {
    console.error("Error creating quiniela:", error);
    throw new Error(
      error instanceof Error ? error.message : "Error al crear la quiniela",
    );
  }
}

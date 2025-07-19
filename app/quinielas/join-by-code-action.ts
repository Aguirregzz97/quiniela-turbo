"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  quinielas,
  quiniela_participants,
  NewQuinielaParticipant,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function joinQuinielaByCode(joinCode: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Find quiniela by join code
    const quiniela = await db
      .select()
      .from(quinielas)
      .where(eq(quinielas.joinCode, joinCode))
      .limit(1);

    if (!quiniela.length) {
      throw new Error("Código de unión inválido");
    }

    const quinielaData = quiniela[0];

    // Check if user is already a participant
    const existingParticipant = await db
      .select()
      .from(quiniela_participants)
      .where(
        and(
          eq(quiniela_participants.quinielaId, quinielaData.id),
          eq(quiniela_participants.userId, session.user.id),
        ),
      );

    if (existingParticipant.length > 0) {
      throw new Error("Ya eres participante de esta quiniela");
    }

    // Create participant record
    const participantData: Omit<
      NewQuinielaParticipant,
      "id" | "createdAt" | "updatedAt"
    > = {
      quinielaId: quinielaData.id,
      userId: session.user.id,
    };

    await db.insert(quiniela_participants).values(participantData);

    // Revalidate the quinielas pages
    revalidatePath("/quinielas");
    revalidatePath(`/quinielas/${quinielaData.id}`);

    return {
      success: true,
      quinielaId: quinielaData.id,
      quinielaName: quinielaData.name,
    };
  } catch (error) {
    console.error("Error joining quiniela by code:", error);
    throw new Error(
      error instanceof Error ? error.message : "Error al unirse a la quiniela",
    );
  }
}

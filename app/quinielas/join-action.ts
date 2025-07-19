"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { quiniela_participants, NewQuinielaParticipant } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

export async function joinQuiniela(quinielaId: string, userId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Usuario no autenticado");
    }

    // Check if user is already a participant
    const existingParticipant = await db
      .select()
      .from(quiniela_participants)
      .where(
        and(
          eq(quiniela_participants.quinielaId, quinielaId),
          eq(quiniela_participants.userId, userId),
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
      quinielaId,
      userId,
    };

    await db.insert(quiniela_participants).values(participantData);

    // Revalidate the quinielas pages
    revalidatePath("/quinielas");
    revalidatePath(`/quinielas/${quinielaId}`);

    return { success: true };
  } catch (error) {
    console.error("Error joining quiniela:", error);
    throw new Error(
      error instanceof Error ? error.message : "Error al unirse a la quiniela",
    );
  }
}

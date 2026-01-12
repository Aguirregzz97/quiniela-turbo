"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { quinielas, quiniela_participants, predictions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function kickParticipant(
  quinielaId: string,
  participantUserId: string
) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
  }

  // Check if the current user is the owner of the quiniela
  const quiniela = await db
    .select({ ownerId: quinielas.ownerId })
    .from(quinielas)
    .where(eq(quinielas.id, quinielaId))
    .limit(1);

  if (!quiniela.length) {
    return { success: false, error: "Quiniela no encontrada" };
  }

  if (quiniela[0].ownerId !== session.user.id) {
    return { success: false, error: "Solo el propietario puede expulsar participantes" };
  }

  // Don't allow kicking the owner
  if (participantUserId === session.user.id) {
    return { success: false, error: "No puedes expulsarte a ti mismo" };
  }

  // Delete the participant's predictions for this quiniela
  await db
    .delete(predictions)
    .where(
      and(
        eq(predictions.quinielaId, quinielaId),
        eq(predictions.userId, participantUserId)
      )
    );

  // Delete the participant
  await db
    .delete(quiniela_participants)
    .where(
      and(
        eq(quiniela_participants.quinielaId, quinielaId),
        eq(quiniela_participants.userId, participantUserId)
      )
    );

  revalidatePath(`/quinielas/${quinielaId}`);

  return { success: true };
}


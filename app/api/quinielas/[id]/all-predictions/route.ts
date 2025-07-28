import { auth } from "@/auth";
import { db } from "@/db";
import { predictions, users, quiniela_participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id: quinielaId } = await params;

    // Verify user is a participant in this quiniela
    const participant = await db
      .select()
      .from(quiniela_participants)
      .where(
        and(
          eq(quiniela_participants.quinielaId, quinielaId),
          eq(quiniela_participants.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!participant.length) {
      return NextResponse.json(
        { error: "No tienes acceso a esta quiniela" },
        { status: 403 },
      );
    }

    // Get all predictions for this quiniela with user information
    const allPredictions = await db
      .select({
        id: predictions.id,
        userId: predictions.userId,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        externalFixtureId: predictions.externalFixtureId,
        externalRound: predictions.externalRound,
        predictedHomeScore: predictions.predictedHomeScore,
        predictedAwayScore: predictions.predictedAwayScore,
        createdAt: predictions.createdAt,
        updatedAt: predictions.updatedAt,
      })
      .from(predictions)
      .innerJoin(users, eq(predictions.userId, users.id))
      .where(eq(predictions.quinielaId, quinielaId));

    return NextResponse.json(allPredictions);
  } catch (error) {
    console.error("Error fetching all predictions:", error);
    return NextResponse.json(
      { error: "Error al obtener las predicciones" },
      { status: 500 },
    );
  }
}

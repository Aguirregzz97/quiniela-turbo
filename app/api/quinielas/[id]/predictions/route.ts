import { auth } from "@/auth";
import { db } from "@/db";
import { predictions } from "@/db/schema";
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

    const userPredictions = await db
      .select({
        id: predictions.id,
        externalFixtureId: predictions.externalFixtureId,
        externalRound: predictions.externalRound,
        predictedHomeScore: predictions.predictedHomeScore,
        predictedAwayScore: predictions.predictedAwayScore,
      })
      .from(predictions)
      .where(
        and(
          eq(predictions.quinielaId, quinielaId),
          eq(predictions.userId, session.user.id),
        ),
      );

    return NextResponse.json(userPredictions);
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return NextResponse.json(
      { error: "Error al obtener las predicciones" },
      { status: 500 },
    );
  }
}

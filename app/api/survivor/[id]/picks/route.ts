import { auth } from "@/auth";
import { db } from "@/db";
import { survivor_game_picks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id: survivorGameId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const picks = await db
      .select()
      .from(survivor_game_picks)
      .where(
        and(
          eq(survivor_game_picks.survivorGameId, survivorGameId),
          eq(survivor_game_picks.userId, session.user.id),
        ),
      );

    return NextResponse.json(picks);
  } catch (error) {
    console.error("Error fetching survivor picks:", error);
    return NextResponse.json(
      { error: "Failed to fetch picks" },
      { status: 500 },
    );
  }
}


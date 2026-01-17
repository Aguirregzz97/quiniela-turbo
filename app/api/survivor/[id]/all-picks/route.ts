import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { survivor_game_picks, survivor_game_participants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: survivorGameId } = await params;

  // Check if user is a participant
  const participation = await db
    .select()
    .from(survivor_game_participants)
    .where(
      and(
        eq(survivor_game_participants.survivorGameId, survivorGameId),
        eq(survivor_game_participants.userId, session.user.id),
      ),
    )
    .limit(1);

  if (participation.length === 0) {
    return NextResponse.json(
      { error: "Not a participant in this game" },
      { status: 403 },
    );
  }

  // Fetch all picks for this survivor game with user info
  const picks = await db
    .select({
      id: survivor_game_picks.id,
      survivorGameId: survivor_game_picks.survivorGameId,
      userId: survivor_game_picks.userId,
      externalFixtureId: survivor_game_picks.externalFixtureId,
      externalRound: survivor_game_picks.externalRound,
      externalPickedTeamId: survivor_game_picks.externalPickedTeamId,
      externalPickedTeamName: survivor_game_picks.externalPickedTeamName,
      createdAt: survivor_game_picks.createdAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(survivor_game_picks)
    .innerJoin(users, eq(survivor_game_picks.userId, users.id))
    .where(eq(survivor_game_picks.survivorGameId, survivorGameId));

  return NextResponse.json(picks);
}


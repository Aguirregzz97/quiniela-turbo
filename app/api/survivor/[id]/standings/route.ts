import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  survivor_games,
  survivor_game_participants,
  survivor_game_picks,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { calculateSurvivorStatusBatch } from "@/lib/survivor/calculateSurvivorStatus";

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
    .where(eq(survivor_game_participants.survivorGameId, survivorGameId))
    .limit(1);

  if (participation.length === 0) {
    return NextResponse.json(
      { error: "Game not found" },
      { status: 404 },
    );
  }

  // Fetch game details
  const game = await db
    .select({
      id: survivor_games.id,
      lives: survivor_games.lives,
      roundsSelected: survivor_games.roundsSelected,
      externalLeagueId: survivor_games.externalLeagueId,
      externalSeason: survivor_games.externalSeason,
      ownerId: survivor_games.ownerId,
    })
    .from(survivor_games)
    .where(eq(survivor_games.id, survivorGameId))
    .limit(1);

  if (game.length === 0) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const survivorGame = game[0];

  // Fetch all participants
  const participants = await db
    .select({
      oderId: survivor_game_participants.userId,
      participantId: survivor_game_participants.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(survivor_game_participants)
    .innerJoin(users, eq(survivor_game_participants.userId, users.id))
    .where(eq(survivor_game_participants.survivorGameId, survivorGameId));

  // Fetch all picks
  const allPicks = await db
    .select({
      id: survivor_game_picks.id,
      oderId: survivor_game_picks.userId,
      externalFixtureId: survivor_game_picks.externalFixtureId,
      externalRound: survivor_game_picks.externalRound,
      externalPickedTeamId: survivor_game_picks.externalPickedTeamId,
      externalPickedTeamName: survivor_game_picks.externalPickedTeamName,
    })
    .from(survivor_game_picks)
    .where(eq(survivor_game_picks.survivorGameId, survivorGameId));

  // Group picks by user using a Map (required by calculateSurvivorStatusBatch)
  const picksByUser = new Map<
    string,
    {
      id: string;
      externalFixtureId: string;
      externalRound: string;
      externalPickedTeamId: string;
      externalPickedTeamName: string | null;
    }[]
  >();

  // Initialize all participants with empty picks
  participants.forEach((p) => {
    picksByUser.set(p.oderId, []);
  });

  // Populate with actual picks
  allPicks.forEach((pick) => {
    const userPicks = picksByUser.get(pick.oderId) || [];
    userPicks.push({
      id: pick.id,
      externalFixtureId: pick.externalFixtureId,
      externalRound: pick.externalRound,
      externalPickedTeamId: pick.externalPickedTeamId,
      externalPickedTeamName: pick.externalPickedTeamName,
    });
    picksByUser.set(pick.oderId, userPicks);
  });

  // Calculate status for all participants
  const statusesMap = await calculateSurvivorStatusBatch(
    picksByUser,
    survivorGame.roundsSelected || [],
    survivorGame.lives,
    survivorGame.externalLeagueId,
    survivorGame.externalSeason,
  );

  // Build response with calculated status
  const calculatedParticipants = participants.map((p) => {
    const status = statusesMap.get(p.oderId) || {
      livesRemaining: survivorGame.lives,
      isEliminated: false,
      eliminatedAtRound: null,
    };

    return {
      ...p,
      livesRemaining: status.livesRemaining,
      isEliminated: status.isEliminated,
      eliminatedAtRound: status.eliminatedAtRound,
    };
  });

  return NextResponse.json({
    participants: calculatedParticipants,
    ownerId: survivorGame.ownerId,
    totalLives: survivorGame.lives,
  });
}


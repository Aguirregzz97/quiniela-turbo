import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  survivor_games,
  users,
  survivor_game_participants,
  survivor_game_picks,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import SurvivorPickHistory from "@/components/SurvivorComponents/SurvivorPickHistory";
import { calculateSurvivorStatusBatch } from "@/lib/survivor/calculateSurvivorStatus";

interface HistorialPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function HistorialPage({ params }: HistorialPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/survivor/${id}/historial`);
  }

  const survivorWithOwner = await db
    .select({
      id: survivor_games.id,
      name: survivor_games.name,
      ownerId: survivor_games.ownerId,
      roundsSelected: survivor_games.roundsSelected,
      lives: survivor_games.lives,
      externalLeagueId: survivor_games.externalLeagueId,
      externalSeason: survivor_games.externalSeason,
    })
    .from(survivor_games)
    .innerJoin(users, eq(survivor_games.ownerId, users.id))
    .where(eq(survivor_games.id, id))
    .limit(1);

  if (!survivorWithOwner.length) {
    notFound();
  }

  const survivorData = survivorWithOwner[0];

  // Fetch participants (without calculated fields)
  const rawParticipants = await db
    .select({
      id: survivor_game_participants.id,
      oderId: survivor_game_participants.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      joinedAt: survivor_game_participants.createdAt,
    })
    .from(survivor_game_participants)
    .innerJoin(users, eq(survivor_game_participants.userId, users.id))
    .where(eq(survivor_game_participants.survivorGameId, id))
    .orderBy(survivor_game_participants.createdAt);

  // Fetch all picks for this game
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
    .where(eq(survivor_game_picks.survivorGameId, id));

  // Group picks by user - initialize all participants with empty arrays first
  const picksByUser = new Map<
    string,
    {
      id: string;
      externalFixtureId: string;
      externalRound: string;
      externalPickedTeamId: string;
      externalPickedTeamName: string;
    }[]
  >();
  
  // Initialize all participants with empty picks array
  for (const participant of rawParticipants) {
    picksByUser.set(participant.oderId, []);
  }
  
  // Add actual picks
  for (const pick of allPicks) {
    const existing = picksByUser.get(pick.oderId) || [];
    existing.push({
      id: pick.id,
      externalFixtureId: pick.externalFixtureId,
      externalRound: pick.externalRound,
      externalPickedTeamId: pick.externalPickedTeamId,
      externalPickedTeamName: pick.externalPickedTeamName,
    });
    picksByUser.set(pick.oderId, existing);
  }

  // Calculate status for all participants
  const statusByUser = await calculateSurvivorStatusBatch(
    picksByUser,
    survivorData.roundsSelected || [],
    survivorData.lives,
    survivorData.externalLeagueId,
    survivorData.externalSeason,
  );

  // Merge calculated status with participant data
  const participants = rawParticipants.map((p) => {
    const status = statusByUser.get(p.oderId) || {
      livesRemaining: survivorData.lives,
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

  return (
    <div className="max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Back Button */}
      <Link
        href={`/survivor/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a {survivorData.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <History className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Historial de Picks
            </h1>
            <p className="text-sm text-muted-foreground">{survivorData.name}</p>
          </div>
        </div>
      </div>

      {/* Pick History */}
      <SurvivorPickHistory
        survivorGameId={survivorData.id}
        participants={participants}
        roundsSelected={survivorData.roundsSelected}
        currentUserId={session.user.id}
        ownerId={survivorData.ownerId}
      />
    </div>
  );
}


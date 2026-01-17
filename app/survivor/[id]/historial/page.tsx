import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { survivor_games, users, survivor_game_participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import SurvivorPickHistory from "@/components/SurvivorComponents/SurvivorPickHistory";

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
    })
    .from(survivor_games)
    .innerJoin(users, eq(survivor_games.ownerId, users.id))
    .where(eq(survivor_games.id, id))
    .limit(1);

  if (!survivorWithOwner.length) {
    notFound();
  }

  const survivorData = survivorWithOwner[0];

  // Fetch participants
  const participants = await db
    .select({
      id: survivor_game_participants.id,
      oderId: survivor_game_participants.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      livesRemaining: survivor_game_participants.livesRemaining,
      isEliminated: survivor_game_participants.isEliminated,
      eliminatedAtRound: survivor_game_participants.eliminatedAtRound,
      joinedAt: survivor_game_participants.createdAt,
    })
    .from(survivor_game_participants)
    .innerJoin(users, eq(survivor_game_participants.userId, users.id))
    .where(eq(survivor_game_participants.survivorGameId, id))
    .orderBy(survivor_game_participants.createdAt);

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


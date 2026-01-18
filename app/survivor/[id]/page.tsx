import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Swords,
  ArrowLeft,
  Edit,
  ChevronRight,
  History,
  Heart,
  Skull,
  Crown,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
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
import SurvivorDetailsDrawer from "@/components/SurvivorComponents/SurvivorDetailsDrawer";
import SurvivorParticipantsDrawer from "@/components/SurvivorComponents/SurvivorParticipantsDrawer";
import DeleteSurvivorDialog from "@/components/SurvivorComponents/DeleteSurvivorDialog";
import { calculateSurvivorStatusBatch } from "@/lib/survivor/calculateSurvivorStatus";

interface SurvivorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SurvivorPage({ params }: SurvivorPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/survivor/${id}`);
  }

  const survivorWithOwner = await db
    .select({
      id: survivor_games.id,
      name: survivor_games.name,
      description: survivor_games.description,
      league: survivor_games.league,
      externalLeagueId: survivor_games.externalLeagueId,
      externalSeason: survivor_games.externalSeason,
      joinCode: survivor_games.joinCode,
      lives: survivor_games.lives,
      moneyToEnter: survivor_games.moneyToEnter,
      prizeDistribution: survivor_games.prizeDistribution,
      roundsSelected: survivor_games.roundsSelected,
      createdAt: survivor_games.createdAt,
      updatedAt: survivor_games.updatedAt,
      ownerId: survivor_games.ownerId,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(survivor_games)
    .innerJoin(users, eq(survivor_games.ownerId, users.id))
    .where(eq(survivor_games.id, id))
    .limit(1);

  if (!survivorWithOwner.length) {
    notFound();
  }

  const survivorData = survivorWithOwner[0];

  // Fetch participants (without the calculated fields)
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
        href="/survivor"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Survivor
      </Link>

      {/* Hero Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-6 sm:p-8">
        {/* Background decoration */}
        <div className="absolute -right-8 -top-8 h-40 w-40 opacity-[0.05] sm:h-56 sm:w-56">
          {survivorData.externalLeagueId ? (
            <Image
              src={`https://media.api-sports.io/football/leagues/${survivorData.externalLeagueId}.png`}
              alt=""
              fill
              className="object-contain"
            />
          ) : (
            <Swords className="h-full w-full" />
          )}
        </div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Logo + Info */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 sm:h-16 sm:w-16">
              {survivorData.externalLeagueId ? (
                <Image
                  src={`https://media.api-sports.io/football/leagues/${survivorData.externalLeagueId}.png`}
                  alt={survivorData.league || "Liga"}
                  width={56}
                  height={56}
                  className="h-10 w-10 object-contain sm:h-12 sm:w-12"
                />
              ) : (
                <Swords className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="mb-1 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
                {survivorData.name}
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                {survivorData.league}
              </p>
              {survivorData.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground/80">
                  {survivorData.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <SurvivorParticipantsDrawer
              survivorGameId={survivorData.id}
              ownerId={survivorData.ownerId}
              currentUserId={session.user.id}
              totalLives={survivorData.lives}
              participants={participants}
            />
            <SurvivorDetailsDrawer survivorData={survivorData} />
            {session?.user?.id === survivorData.ownerId && (
              <>
                <Button asChild size="sm">
                  <Link href={`/survivor/${survivorData.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Editar Survivor</span>
                    <span className="sm:hidden">Editar</span>
                  </Link>
                </Button>
                <DeleteSurvivorDialog
                  survivorGameId={survivorData.id}
                  survivorGameName={survivorData.name}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/survivor/${survivorData.id}/seleccionar-equipo`}
          className="group"
        >
          <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
            <CardContent className="flex items-center gap-4 p-5 sm:p-6">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
                <Swords className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold transition-colors group-hover:text-primary">
                  Seleccionar Equipo
                </h3>
                <p className="text-sm text-muted-foreground">
                  Elige tu equipo para cada jornada
                </p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>

        <Link
          href={`/survivor/${survivorData.id}/historial`}
          className="group"
        >
          <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
            <CardContent className="flex items-center gap-4 p-5 sm:p-6">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 transition-transform duration-300 group-hover:scale-110">
                <History className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold transition-colors group-hover:text-primary">
                  Historial de Picks
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ve los picks de todos los jugadores
                </p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Players Sections */}
      {participants.length > 0 && (
        <div className="space-y-8">
          {/* Alive Players */}
          {(() => {
            const alivePlayers = participants
              .filter((p) => !p.isEliminated)
              .sort((a, b) => b.livesRemaining - a.livesRemaining);

            if (alivePlayers.length === 0) return null;

            // Check if there's a winner (1 alive, others eliminated)
            const eliminatedPlayers = participants.filter((p) => p.isEliminated);
            const hasWinner =
              alivePlayers.length === 1 && eliminatedPlayers.length > 0;

            return (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10">
                    <Heart className="h-4 w-4 text-green-500" />
                  </div>
                  <h2 className="text-lg font-semibold">Jugadores Vivos</h2>
                  <Badge
                    variant="secondary"
                    className="ml-auto bg-green-500/10 text-green-600"
                  >
                    {alivePlayers.length}
                  </Badge>
                </div>

                {hasWinner && (
                  <Card className="mb-4 overflow-hidden border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
                        <Trophy className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-amber-600">
                          ¡Tenemos un ganador!
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {alivePlayers[0]?.userName || "Sin nombre"} es el
                          último sobreviviente
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {alivePlayers.map((participant, index) => {
                    const isCurrentUser =
                      participant.oderId === session.user.id;
                    const isOwner = participant.oderId === survivorData.ownerId;

                    return (
                      <Card
                        key={participant.id}
                        className={`relative overflow-hidden border-border/50 ${
                          isCurrentUser ? "ring-2 ring-primary/50" : ""
                        }`}
                      >
                        {/* Rank indicator for top 3 */}
                        {index < 3 && (
                          <div
                            className={`absolute left-0 top-0 h-full w-1 ${
                              index === 0
                                ? "bg-amber-500"
                                : index === 1
                                  ? "bg-slate-400"
                                  : "bg-amber-700"
                            }`}
                          />
                        )}

                        <CardContent className="flex items-center gap-3 p-4">
                          <div className="relative">
                            <div className="relative h-11 w-11 overflow-hidden rounded-full bg-muted ring-2 ring-green-500/30">
                              <Image
                                src={
                                  participant.userImage || "/img/profile.png"
                                }
                                alt={participant.userName || "Participante"}
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            </div>
                            {isOwner && (
                              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                                <Crown className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-medium">
                                {participant.userName || "Sin nombre"}
                              </p>
                              {isCurrentUser && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1 text-[10px]"
                                >
                                  Tú
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              {Array.from({
                                length: survivorData.lives,
                              }).map((_, i) => (
                                <Heart
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < participant.livesRemaining
                                      ? "fill-red-500 text-red-500"
                                      : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-right">
                            <p className="text-lg font-bold text-green-600">
                              {participant.livesRemaining}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {participant.livesRemaining === 1
                                ? "vida"
                                : "vidas"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Eliminated Players */}
          {(() => {
            const eliminatedPlayers = participants
              .filter((p) => p.isEliminated)
              .sort(
                (a, b) =>
                  new Date(b.joinedAt).getTime() -
                  new Date(a.joinedAt).getTime(),
              );

            if (eliminatedPlayers.length === 0) return null;

            return (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
                    <Skull className="h-4 w-4 text-red-500" />
                  </div>
                  <h2 className="text-lg font-semibold text-muted-foreground">
                    Eliminados
                  </h2>
                  <Badge
                    variant="secondary"
                    className="ml-auto bg-red-500/10 text-red-600"
                  >
                    {eliminatedPlayers.length}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {eliminatedPlayers.map((participant) => {
                    const isCurrentUser =
                      participant.oderId === session.user.id;
                    const isOwner = participant.oderId === survivorData.ownerId;

                    return (
                      <Card
                        key={participant.id}
                        className={`relative overflow-hidden border-border/30 bg-muted/20 opacity-70 ${
                          isCurrentUser ? "ring-2 ring-destructive/30" : ""
                        }`}
                      >
                        <CardContent className="flex items-center gap-3 p-4">
                          <div className="relative">
                            <div className="relative h-11 w-11 overflow-hidden rounded-full bg-muted ring-2 ring-red-500/20">
                              <Image
                                src={
                                  participant.userImage || "/img/profile.png"
                                }
                                alt={participant.userName || "Participante"}
                                fill
                                className="object-cover grayscale"
                                sizes="44px"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Skull className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            {isOwner && (
                              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/50">
                                <Crown className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-medium line-through">
                                {participant.userName || "Sin nombre"}
                              </p>
                              {isCurrentUser && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 bg-destructive/10 px-1 text-[10px] text-destructive"
                                >
                                  Tú
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {participant.eliminatedAtRound
                                ? `Eliminado en ${participant.eliminatedAtRound}`
                                : "Eliminado"}
                            </p>
                          </div>

                          <Badge variant="destructive" className="gap-1">
                            <Skull className="h-3 w-3" />
                            OUT
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}


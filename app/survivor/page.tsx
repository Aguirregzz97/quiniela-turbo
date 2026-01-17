import { Card, CardContent } from "@/components/ui/card";
import {
  Swords,
  Plus,
  Calendar,
  Users,
  Crown,
  ChevronRight,
  Heart,
  Skull,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { db } from "@/db";
import { survivor_games, survivor_game_participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function SurvivorPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/survivor");
  }

  const userSurvivorGames = await db
    .select({
      id: survivor_games.id,
      name: survivor_games.name,
      description: survivor_games.description,
      league: survivor_games.league,
      externalLeagueId: survivor_games.externalLeagueId,
      joinCode: survivor_games.joinCode,
      lives: survivor_games.lives,
      createdAt: survivor_games.createdAt,
      updatedAt: survivor_games.updatedAt,
      ownerId: survivor_games.ownerId,
      participantId: survivor_game_participants.id,
      livesRemaining: survivor_game_participants.livesRemaining,
      isEliminated: survivor_game_participants.isEliminated,
      joinedAt: survivor_game_participants.createdAt,
    })
    .from(survivor_game_participants)
    .innerJoin(
      survivor_games,
      eq(survivor_game_participants.survivorGameId, survivor_games.id),
    )
    .where(eq(survivor_game_participants.userId, session.user.id))
    .orderBy(survivor_game_participants.createdAt);

  return (
    <div className="max-w-6xl px-4 py-6 sm:ml-6 sm:mt-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 sm:h-12 sm:w-12">
            <Swords className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              Survivor
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Elige un equipo cada jornada y sobrevive hasta el final
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {userSurvivorGames.length === 0 ? (
        <Card className="overflow-hidden border-border/50">
          <CardContent className="p-0">
            <div className="bg-gradient-to-b from-primary/5 to-transparent p-8 text-center sm:p-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/80 backdrop-blur">
                <Swords className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                No tienes juegos de Survivor aún
              </h3>
              <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                Únete a un juego existente con un código de invitación o crea tu
                primer juego de Survivor
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/survivor/create">
                    <Plus className="h-4 w-4" />
                    Crear Survivor
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/survivor/join">
                    <Users className="h-4 w-4" />
                    Unirse con Código
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Existing Survivor Games */}
          {userSurvivorGames.map((game) => {
            const isOwner = game.ownerId === session.user.id;
            return (
              <Link
                key={game.id}
                href={`/survivor/${game.id}`}
                className="group"
              >
                <Card className="relative h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
                  {/* League Image Background */}
                  <div className="absolute -right-6 -top-6 h-32 w-32 opacity-[0.07] transition-transform duration-500 group-hover:scale-110">
                    {game.externalLeagueId ? (
                      <Image
                        src={`https://media.api-sports.io/football/leagues/${game.externalLeagueId}.png`}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <Swords className="h-full w-full" />
                    )}
                  </div>

                  <CardContent className="relative p-4 sm:p-5">
                    {/* Top Row: League Badge + Title */}
                    <div className="mb-3 flex items-start gap-3 sm:mb-4">
                      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-black/5 sm:h-12 sm:w-12 sm:rounded-xl">
                        {game.externalLeagueId ? (
                          <Image
                            src={`https://media.api-sports.io/football/leagues/${game.externalLeagueId}.png`}
                            alt={game.league || "Liga"}
                            width={40}
                            height={40}
                            className="h-7 w-7 object-contain sm:h-9 sm:w-9"
                          />
                        ) : (
                          <Swords className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold transition-colors group-hover:text-primary sm:text-lg">
                          {game.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground sm:text-sm">
                          {game.league}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </div>

                    {/* Description */}
                    {game.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground sm:mb-4 sm:text-sm">
                        {game.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {/* Owner Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs ${
                          isOwner
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isOwner ? (
                          <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        ) : (
                          <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        )}
                        {isOwner ? "Propietario" : "Participante"}
                      </span>

                      {/* Lives Status */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs ${
                          game.isEliminated
                            ? "bg-destructive/10 text-destructive"
                            : "bg-green-500/10 text-green-600 dark:text-green-400"
                        }`}
                      >
                        {game.isEliminated ? (
                          <Skull className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        ) : (
                          <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        )}
                        {game.isEliminated
                          ? "Eliminado"
                          : `${game.livesRemaining}/${game.lives} vidas`}
                      </span>

                      {/* Date */}
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">
                        <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {new Date(game.joinedAt).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>

                      {/* Join Code */}
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary sm:rounded-md sm:px-2 sm:py-1 sm:text-xs">
                        {game.joinCode}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {/* Add New Survivor Game Card */}
          <Card className="group relative h-full overflow-hidden border-2 border-dashed border-border/50 bg-transparent transition-all duration-300 hover:border-primary/50 hover:bg-primary/5">
            <CardContent className="flex h-full min-h-[180px] flex-col items-center justify-center p-4 text-center sm:min-h-[200px] sm:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110 sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl">
                <Plus className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </div>
              <h3 className="mb-1 text-base font-semibold sm:text-lg">
                Nuevo Survivor
              </h3>
              <p className="mb-4 text-xs text-muted-foreground sm:mb-5 sm:text-sm">
                Crea o únete a un juego
              </p>
              <div className="flex w-full flex-col gap-2">
                <Button asChild size="sm" className="w-full gap-2">
                  <Link href="/survivor/create">
                    <Plus className="h-4 w-4" />
                    Crear Survivor
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                >
                  <Link href="/survivor/join">
                    <Users className="h-4 w-4" />
                    Unirse a Survivor
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

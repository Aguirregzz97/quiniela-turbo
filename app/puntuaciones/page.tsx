import { BarChart3, Trophy, Award, Swords } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  quinielas,
  quiniela_participants,
  quiniela_settings,
  survivor_games,
  survivor_game_participants,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import ClasificacionesChart from "@/components/QuinielaComponents/ClasificacionesChart";
import SurvivorPuntuaciones from "@/components/SurvivorComponents/SurvivorPuntuaciones";

export default async function ClasificacionesPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/puntuaciones");
  }

  const userQuinielas = await db
    .select({
      id: quinielas.id,
      name: quinielas.name,
      description: quinielas.description,
      league: quinielas.league,
      externalLeagueId: quinielas.externalLeagueId,
      externalSeason: quinielas.externalSeason,
      roundsSelected: quinielas.roundsSelected,
      joinCode: quinielas.joinCode,
      ownerId: quinielas.ownerId,
      exactPoints: quiniela_settings.pointsForExactResultPrediction,
      correctResultPoints: quiniela_settings.pointsForCorrectResultPrediction,
    })
    .from(quiniela_participants)
    .innerJoin(quinielas, eq(quiniela_participants.quinielaId, quinielas.id))
    .leftJoin(quiniela_settings, eq(quinielas.id, quiniela_settings.quinielaId))
    .where(eq(quiniela_participants.userId, session.user.id))
    .orderBy(quiniela_participants.createdAt);

  // Fetch user's survivor games
  const userSurvivorGames = await db
    .select({
      id: survivor_games.id,
      name: survivor_games.name,
      league: survivor_games.league,
      externalLeagueId: survivor_games.externalLeagueId,
      joinCode: survivor_games.joinCode,
    })
    .from(survivor_game_participants)
    .innerJoin(
      survivor_games,
      eq(survivor_game_participants.survivorGameId, survivor_games.id),
    )
    .where(eq(survivor_game_participants.userId, session.user.id))
    .orderBy(survivor_game_participants.createdAt);

  const hasQuinielas = userQuinielas.length > 0;
  const hasSurvivorGames = userSurvivorGames.length > 0;
  const hasAnyGames = hasQuinielas || hasSurvivorGames;

  return (
    <div className="max-w-6xl px-4 py-6 sm:ml-6 sm:mt-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 sm:h-12 sm:w-12">
            <BarChart3 className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              Puntuaciones
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Clasificaciones de tus juegos
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasAnyGames ? (
        <Card className="overflow-hidden border-border/50">
          <CardContent className="p-0">
            <div className="bg-gradient-to-b from-primary/5 to-transparent p-8 text-center sm:p-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/80 backdrop-blur">
                <Trophy className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                No tienes juegos aún
              </h3>
              <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                Únete a una quiniela o juego de survivor para ver las
                clasificaciones
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Quinielas Section */}
          {hasQuinielas && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Award className="h-4 w-4 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold">Quinielas</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {userQuinielas.length}
                </span>
              </div>

              <div className="space-y-4">
                {userQuinielas.map((quiniela) => (
                  <Card
                    key={quiniela.id}
                    className="overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg"
                  >
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className="relative border-b border-border/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-6">
                        {/* Background decoration */}
                        <div className="absolute -right-8 -top-8 h-32 w-32 opacity-[0.05]">
                          {quiniela.externalLeagueId ? (
                            <Image
                              src={`https://media.api-sports.io/football/leagues/${quiniela.externalLeagueId}.png`}
                              alt=""
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <Trophy className="h-full w-full" />
                          )}
                        </div>

                        <div className="relative flex items-center gap-3 sm:gap-4">
                          {/* League Badge */}
                          <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 sm:h-14 sm:w-14">
                            {quiniela.externalLeagueId ? (
                              <Image
                                src={`https://media.api-sports.io/football/leagues/${quiniela.externalLeagueId}.png`}
                                alt={quiniela.league || "Liga"}
                                width={48}
                                height={48}
                                className="h-9 w-9 object-contain sm:h-10 sm:w-10"
                              />
                            ) : (
                              <Trophy className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
                            )}
                          </div>

                          {/* Quiniela Info */}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-lg font-bold sm:text-xl">
                              {quiniela.name}
                            </h3>
                            <p className="truncate text-sm text-muted-foreground">
                              {quiniela.league}
                            </p>
                          </div>

                          {/* Join Code */}
                          <span className="hidden rounded-lg bg-amber-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-amber-600 sm:inline-flex">
                            {quiniela.joinCode}
                          </span>
                        </div>
                      </div>

                      {/* Chart Section */}
                      <div className="p-4 sm:p-6">
                        <ClasificacionesChart
                          quiniela={{
                            id: quiniela.id,
                            name: quiniela.name,
                            description: quiniela.description,
                            league: quiniela.league,
                            externalLeagueId: quiniela.externalLeagueId,
                            externalSeason: quiniela.externalSeason,
                            roundsSelected: quiniela.roundsSelected,
                            joinCode: quiniela.joinCode,
                            ownerId: quiniela.ownerId,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                          }}
                          exactPoints={quiniela.exactPoints ?? 2}
                          correctResultPoints={quiniela.correctResultPoints ?? 1}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Survivor Section */}
          {hasSurvivorGames && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
                  <Swords className="h-4 w-4 text-rose-600" />
                </div>
                <h2 className="text-lg font-semibold">Survivor</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {userSurvivorGames.length}
                </span>
              </div>

              <div className="space-y-4">
                {userSurvivorGames.map((game) => (
                  <Card
                    key={game.id}
                    className="overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg"
                  >
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className="relative border-b border-border/50 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-4 sm:p-6">
                        {/* Background decoration */}
                        <div className="absolute -right-8 -top-8 h-32 w-32 opacity-[0.05]">
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

                        <div className="relative flex items-center gap-3 sm:gap-4">
                          {/* League Badge */}
                          <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 sm:h-14 sm:w-14">
                            {game.externalLeagueId ? (
                              <Image
                                src={`https://media.api-sports.io/football/leagues/${game.externalLeagueId}.png`}
                                alt={game.league || "Liga"}
                                width={48}
                                height={48}
                                className="h-9 w-9 object-contain sm:h-10 sm:w-10"
                              />
                            ) : (
                              <Swords className="h-6 w-6 text-rose-600 sm:h-7 sm:w-7" />
                            )}
                          </div>

                          {/* Game Info */}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-lg font-bold sm:text-xl">
                              {game.name}
                            </h3>
                            <p className="truncate text-sm text-muted-foreground">
                              {game.league}
                            </p>
                          </div>

                          {/* Join Code */}
                          <span className="hidden rounded-lg bg-rose-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-rose-600 sm:inline-flex">
                            {game.joinCode}
                          </span>
                        </div>
                      </div>

                      {/* Standings Section */}
                      <div className="p-4 sm:p-6">
                        <SurvivorPuntuaciones
                          survivorGameId={game.id}
                          currentUserId={session.user.id}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}


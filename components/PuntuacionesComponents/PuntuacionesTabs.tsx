"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Swords, Trophy } from "lucide-react";
import Image from "next/image";
import ClasificacionesChart from "@/components/QuinielaComponents/ClasificacionesChart";
import SurvivorPuntuaciones from "@/components/SurvivorComponents/SurvivorPuntuaciones";

interface Quiniela {
  id: string;
  name: string;
  description: string;
  league: string;
  externalLeagueId: string;
  externalSeason: string;
  roundsSelected: { roundName: string; dates: string[] }[] | null;
  joinCode: string;
  ownerId: string;
  exactPoints: number | null;
  correctResultPoints: number | null;
}

interface SurvivorGame {
  id: string;
  name: string;
  league: string | null;
  externalLeagueId: string;
  joinCode: string;
}

interface PuntuacionesTabsProps {
  quinielas: Quiniela[];
  survivorGames: SurvivorGame[];
  currentUserId: string;
}

export default function PuntuacionesTabs({
  quinielas,
  survivorGames,
  currentUserId,
}: PuntuacionesTabsProps) {
  const hasQuinielas = quinielas.length > 0;
  const hasSurvivorGames = survivorGames.length > 0;

  return (
    <Tabs defaultValue="quinielas" className="w-full">
      <TabsList className="mb-6 h-auto w-full gap-1 bg-muted/50 p-1 sm:w-auto">
        <TabsTrigger
          value="quinielas"
          className="flex-1 gap-2 px-4 py-2.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm sm:flex-none"
        >
          <Award className="h-4 w-4" />
          <span>Quinielas</span>
          {hasQuinielas && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {quinielas.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="survivor"
          className="flex-1 gap-2 px-4 py-2.5 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-600 data-[state=active]:shadow-sm sm:flex-none"
        >
          <Swords className="h-4 w-4" />
          <span>Survivor</span>
          {hasSurvivorGames && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {survivorGames.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="quinielas" className="mt-0">
        {hasQuinielas ? (
          <div className="space-y-4">
            {quinielas.map((quiniela) => (
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
                        roundsSelected: quiniela.roundsSelected ?? [],
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
        ) : (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                <Award className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">
                Sin quinielas aún
              </h2>
              <p className="max-w-md text-muted-foreground">
                Únete a una quiniela y comienza a hacer pronósticos para ver las
                puntuaciones aquí.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="survivor" className="mt-0">
        {hasSurvivorGames ? (
          <div className="space-y-4">
            {survivorGames.map((game) => (
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
                      currentUserId={currentUserId}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
                <Swords className="h-8 w-8 text-rose-500" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">
                Sin juegos de Survivor aún
              </h2>
              <p className="max-w-md text-muted-foreground">
                Únete a un juego de Survivor y comienza a hacer picks para ver
                las puntuaciones aquí.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}


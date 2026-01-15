import { BarChart3, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { quinielas, quiniela_participants, quiniela_settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import ClasificacionesChart from "@/components/QuinielaComponents/ClasificacionesChart";

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
              Puntuaciones globales de tus quinielas
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {userQuinielas.length === 0 ? (
        <Card className="overflow-hidden border-border/50">
          <CardContent className="p-0">
            <div className="bg-gradient-to-b from-primary/5 to-transparent p-8 text-center sm:p-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/80 backdrop-blur">
                <Trophy className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                No tienes quinielas aún
              </h3>
              <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                Únete a una quiniela para ver las clasificaciones de los
                participantes
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {userQuinielas.map((quiniela) => (
            <Card
              key={quiniela.id}
              className="overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="p-0">
                {/* Card Header */}
                <div className="relative border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6">
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
                      <h2 className="truncate text-lg font-bold sm:text-xl">
                        {quiniela.name}
                      </h2>
                      <p className="truncate text-sm text-muted-foreground">
                        {quiniela.league}
                      </p>
                    </div>

                    {/* Join Code */}
                    <span className="hidden rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-primary sm:inline-flex">
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
      )}
    </div>
  );
}


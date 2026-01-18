import { BarChart3, Trophy } from "lucide-react";
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
import PuntuacionesTabs from "@/components/PuntuacionesComponents/PuntuacionesTabs";

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
        <PuntuacionesTabs
          quinielas={userQuinielas}
          survivorGames={userSurvivorGames}
          currentUserId={session.user.id}
        />
      )}
    </div>
  );
}

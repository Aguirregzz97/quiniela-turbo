import { Card, CardContent } from "@/components/ui/card";
import {
  Award,
  ArrowLeft,
  Edit,
  Dices,
  Users,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  quinielas,
  users,
  quiniela_settings,
  quiniela_participants,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import QuinielaDetailsDrawer from "@/components/QuinielaComponents/QuinielaDetailsDrawer";
import QuinielaLeaderboard from "@/components/QuinielaComponents/QuinielaLeaderboard";
import QuinielaParticipantsDrawer from "@/components/QuinielaComponents/QuinielaParticipantsDrawer";
import DeleteQuinielaDialog from "@/components/QuinielaComponents/DeleteQuinielaDialog";

interface QuinielaPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuinielaPage({ params }: QuinielaPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/quinielas/${id}`);
  }

  const quinielaWithOwnerAndSettings = await db
    .select({
      id: quinielas.id,
      name: quinielas.name,
      description: quinielas.description,
      league: quinielas.league,
      externalLeagueId: quinielas.externalLeagueId,
      externalSeason: quinielas.externalSeason,
      joinCode: quinielas.joinCode,
      createdAt: quinielas.createdAt,
      updatedAt: quinielas.updatedAt,
      ownerId: quinielas.ownerId,
      ownerName: users.name,
      ownerEmail: users.email,
      roundsSelected: quinielas.roundsSelected,
      pointsForExactResultPrediction:
        quiniela_settings.pointsForExactResultPrediction,
      pointsForCorrectResultPrediction:
        quiniela_settings.pointsForCorrectResultPrediction,
      moneyToEnter: quiniela_settings.moneyToEnter,
      prizeDistribution: quiniela_settings.prizeDistribution,
    })
    .from(quinielas)
    .innerJoin(users, eq(quinielas.ownerId, users.id))
    .leftJoin(quiniela_settings, eq(quinielas.id, quiniela_settings.quinielaId))
    .where(eq(quinielas.id, id))
    .limit(1);

  if (!quinielaWithOwnerAndSettings.length) {
    notFound();
  }

  const quinielaData = quinielaWithOwnerAndSettings[0];

  // Fetch participants
  const participants = await db
    .select({
      id: quiniela_participants.id,
      userId: quiniela_participants.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      joinedAt: quiniela_participants.createdAt,
    })
    .from(quiniela_participants)
    .innerJoin(users, eq(quiniela_participants.userId, users.id))
    .where(eq(quiniela_participants.quinielaId, id))
    .orderBy(quiniela_participants.createdAt);

  return (
    <div className="max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Back Button */}
      <Link
        href="/quinielas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Quinielas
      </Link>

      {/* Hero Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-6 sm:p-8">
        {/* Background decoration */}
        <div className="absolute -right-8 -top-8 h-40 w-40 opacity-[0.05] sm:h-56 sm:w-56">
          {quinielaData.externalLeagueId ? (
            <Image
              src={`https://media.api-sports.io/football/leagues/${quinielaData.externalLeagueId}.png`}
              alt=""
              fill
              className="object-contain"
            />
          ) : (
            <Award className="h-full w-full" />
          )}
        </div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Logo + Info */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 sm:h-16 sm:w-16">
              {quinielaData.externalLeagueId ? (
                <Image
                  src={`https://media.api-sports.io/football/leagues/${quinielaData.externalLeagueId}.png`}
                  alt={quinielaData.league || "Liga"}
                  width={56}
                  height={56}
                  className="h-10 w-10 object-contain sm:h-12 sm:w-12"
                />
              ) : (
                <Award className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="mb-1 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
                {quinielaData.name}
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                {quinielaData.league}
              </p>
              {quinielaData.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground/80">
                  {quinielaData.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <QuinielaParticipantsDrawer
              quinielaId={quinielaData.id}
              ownerId={quinielaData.ownerId}
              currentUserId={session.user.id}
              participants={participants}
            />
            <QuinielaDetailsDrawer quinielaData={quinielaData} participantCount={participants.length} />
            {session?.user?.id === quinielaData.ownerId && (
              <>
                <Button asChild size="sm">
                  <Link href={`/quinielas/${quinielaData.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Editar Quiniela</span>
                    <span className="sm:hidden">Editar</span>
                  </Link>
                </Button>
                <DeleteQuinielaDialog
                  quinielaId={quinielaData.id}
                  quinielaName={quinielaData.name}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <Link
          href={`/quinielas/${quinielaData.id}/registrar-pronosticos`}
          className="group"
        >
          <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
            <CardContent className="flex items-center gap-4 p-5 sm:p-6">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
                <Dices className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold transition-colors group-hover:text-primary">
                  Registrar Pronósticos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Haz tus predicciones para los partidos
                </p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Resultados Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">
          Resultados de Pronósticos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={`/quinielas/${quinielaData.id}/resultados-por-usuario`}
            className="group"
          >
            <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
              <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold transition-colors group-hover:text-primary">
                    Resultados Por Usuario
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ve los resultados de las predicciones de cada usuario
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>

          <Link
            href={`/quinielas/${quinielaData.id}/resultados-por-partido`}
            className="group"
          >
            <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
              <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold transition-colors group-hover:text-primary">
                    Resultados Por Partido
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ve los resultados de las predicciones de cada partido
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Leaderboard */}
      <QuinielaLeaderboard
        quiniela={{
          id: quinielaData.id,
          name: quinielaData.name,
          description: quinielaData.description,
          league: quinielaData.league,
          externalLeagueId: quinielaData.externalLeagueId,
          externalSeason: quinielaData.externalSeason,
          joinCode: quinielaData.joinCode,
          createdAt: quinielaData.createdAt,
          updatedAt: quinielaData.updatedAt,
          ownerId: quinielaData.ownerId,
          roundsSelected: quinielaData.roundsSelected,
        }}
        exactPoints={quinielaData.pointsForExactResultPrediction ?? 2}
        correctResultPoints={quinielaData.pointsForCorrectResultPrediction ?? 1}
        moneyToEnter={quinielaData.moneyToEnter ?? undefined}
        prizeDistribution={quinielaData.prizeDistribution ?? undefined}
        participantCount={participants.length}
      />
    </div>
  );
}

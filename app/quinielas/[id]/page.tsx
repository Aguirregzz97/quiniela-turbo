import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, ArrowLeft, Edit, Dices, Eye } from "lucide-react";
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

  console.log(quinielaData);

  return (
    <div className="container mx-auto p-4 px-2 sm:p-6">
      {/* Header with back button */}
      <div className="mb-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" asChild className="self-start">
            <Link className="pl-0" href="/quinielas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Quinielas
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <QuinielaParticipantsDrawer
              quinielaId={quinielaData.id}
              ownerId={quinielaData.ownerId}
              currentUserId={session.user.id}
              participants={participants}
            />
            <QuinielaDetailsDrawer quinielaData={quinielaData} />
            {session?.user?.id === quinielaData.ownerId && (
              <Button asChild size="sm" className="sm:size-default">
                <Link href={`/quinielas/${quinielaData.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Editar Quiniela</span>
                  <span className="sm:hidden">Editar</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-white shadow-md">
            {quinielaData.externalLeagueId ? (
              <Image
                src={`https://media.api-sports.io/football/leagues/${quinielaData.externalLeagueId}.png`}
                alt={quinielaData.league || "Liga"}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <Award className="h-8 w-8 text-primary" />
            )}
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-xl font-bold sm:text-3xl">
                {quinielaData.name}
              </h1>
            </div>
            <p className="font-medium text-muted-foreground">
              {quinielaData.league}
            </p>
          </div>
        </div>
      </div>

      {/* Quiniela Actions */}
      <div className="grid gap-6">
        {/* Predictions Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <Link href={`/quinielas/${quinielaData.id}/registrar-pronosticos`}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Dices className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Registrar Pronósticos</h3>
                  <p className="text-sm text-muted-foreground">
                    Haz tus predicciones para los partidos de esta quiniela
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <Link href={`/quinielas/${quinielaData.id}/ver-pronosticos`}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Eye className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Ver Pronósticos</h3>
                  <p className="text-sm text-muted-foreground">
                    Ve todos los pronósticos de los participantes
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>
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
          correctResultPoints={
            quinielaData.pointsForCorrectResultPrediction ?? 1
          }
        />
      </div>
    </div>
  );
}

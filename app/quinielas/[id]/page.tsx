import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, ArrowLeft, Edit, Dices, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { db } from "@/db";
import { quinielas, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import QuinielaDetailsCard from "@/components/QuinielaComponents/QuinielaDetailsCard";

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

  const quinielaWithOwner = await db
    .select({
      id: quinielas.id,
      name: quinielas.name,
      description: quinielas.description,
      league: quinielas.league,
      externalLeagueId: quinielas.externalLeagueId,
      joinCode: quinielas.joinCode,
      createdAt: quinielas.createdAt,
      updatedAt: quinielas.updatedAt,
      ownerId: quinielas.ownerId,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(quinielas)
    .innerJoin(users, eq(quinielas.ownerId, users.id))
    .where(eq(quinielas.id, id))
    .limit(1);

  if (!quinielaWithOwner.length) {
    notFound();
  }

  const quinielaData = quinielaWithOwner[0];

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Header with back button */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link className="pl-0" href="/quinielas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Quinielas
            </Link>
          </Button>

          {session.user.id === quinielaData.ownerId && (
            <Button asChild>
              <Link href={`/quinielas/${quinielaData.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar Quiniela
              </Link>
            </Button>
          )}
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
              <h1 className="text-2xl font-bold sm:text-3xl">
                {quinielaData.name}
              </h1>
            </div>
            <p className="font-medium text-muted-foreground">
              {quinielaData.league}
            </p>
          </div>
        </div>
      </div>

      {/* Quiniela Details */}
      <div className="grid gap-6">
        <QuinielaDetailsCard quinielaData={quinielaData} />

        {/* Predictions Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <Link href={`/quinielas/${quinielaData.id}/predictions`}>
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
            <Link href={`/quinielas/${quinielaData.id}/pronosticos`}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Eye className="h-6 w-6 text-blue-600" />
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
      </div>
    </div>
  );
}

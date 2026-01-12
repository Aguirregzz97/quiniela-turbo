import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Plus, Calendar, Users, Award, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { db } from "@/db";
import { quinielas, quiniela_participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function QuinielasPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/quinielas");
  }

  const userQuinielas = await db
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
      participantId: quiniela_participants.id,
      joinedAt: quiniela_participants.createdAt,
    })
    .from(quiniela_participants)
    .innerJoin(quinielas, eq(quiniela_participants.quinielaId, quinielas.id))
    .where(eq(quiniela_participants.userId, session.user.id))
    .orderBy(quiniela_participants.createdAt);

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Award className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
          Mis Quinielas
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gestiona y participa en quinielas de padel
        </p>
      </div>

      <div className="grid gap-6">
        {/* Existing Quinielas */}
        {userQuinielas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                No tienes quinielas aún
              </h3>
              <p className="mb-4 text-muted-foreground">
                Únete a una quiniela existente o crea tu primera quiniela
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/quinielas/join">
                    <Users className="mr-2 h-4 w-4" />
                    Unirse a Quiniela
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/quinielas/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primera Quiniela
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Existing Quinielas */}
            {userQuinielas.map((quiniela) => (
              <Card
                key={quiniela.id}
                className="group cursor-pointer transition-shadow hover:shadow-lg"
              >
                <Link href={`/quinielas/${quiniela.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white shadow-sm">
                          {quiniela.externalLeagueId ? (
                            <Image
                              src={`https://media.api-sports.io/football/leagues/${quiniela.externalLeagueId}.png`}
                              alt={quiniela.league || "Liga"}
                              width={32}
                              height={32}
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <Trophy className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg transition-colors group-hover:text-primary">
                            {quiniela.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {quiniela.league}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                      {quiniela.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {quiniela.ownerId === session.user.id
                            ? "Creada"
                            : "Unida"}{" "}
                          el{" "}
                          {new Date(quiniela.joinedAt).toLocaleDateString(
                            "es-ES",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>
                          {quiniela.ownerId === session.user.id
                            ? "Propietario"
                            : "Participante"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="rounded bg-primary/10 px-2 py-1 font-mono font-semibold text-primary">
                          {quiniela.joinCode}
                        </span>
                        <span className="text-muted-foreground">
                          Código de unión
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
            {/* Add New Quiniela Card */}
            <Card className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary hover:shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Nueva Quiniela</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Crea una nueva quiniela o únete a una existente
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild size="sm">
                    <Link href="/quinielas/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Quiniela
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/quinielas/join">
                      <Users className="mr-2 h-4 w-4" />
                      Unirse a Quiniela
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

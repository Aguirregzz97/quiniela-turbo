import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  Plus,
  Calendar,
  Users,
  Award,
  Crown,
  ChevronRight,
} from "lucide-react";
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
    <div className="max-w-6xl px-4 py-6 sm:ml-6 sm:mt-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 sm:h-12 sm:w-12">
            <Award className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              Mis Quinielas
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Gestiona y participa en quinielas de fútbol
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
                Únete a una quiniela existente con un código de invitación o
                crea tu primera quiniela
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/quinielas/create">
                    <Plus className="h-4 w-4" />
                    Crear Quiniela
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/quinielas/join">
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
          {/* Existing Quinielas */}
          {userQuinielas.map((quiniela) => {
            const isOwner = quiniela.ownerId === session.user.id;
            return (
              <Link
                key={quiniela.id}
                href={`/quinielas/${quiniela.id}`}
                className="group"
              >
                <Card className="relative h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
                  {/* League Image Background */}
                  <div className="absolute -right-6 -top-6 h-32 w-32 opacity-[0.07] transition-transform duration-500 group-hover:scale-110">
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

                  <CardContent className="relative p-4 sm:p-5">
                    {/* Top Row: League Badge + Title */}
                    <div className="mb-3 flex items-start gap-3 sm:mb-4">
                      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-black/5 sm:h-12 sm:w-12 sm:rounded-xl">
                        {quiniela.externalLeagueId ? (
                          <Image
                            src={`https://media.api-sports.io/football/leagues/${quiniela.externalLeagueId}.png`}
                            alt={quiniela.league || "Liga"}
                            width={40}
                            height={40}
                            className="h-7 w-7 object-contain sm:h-9 sm:w-9"
                          />
                        ) : (
                          <Trophy className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold transition-colors group-hover:text-primary sm:text-lg">
                          {quiniela.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground sm:text-sm">
                          {quiniela.league}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </div>

                    {/* Description */}
                    {quiniela.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground sm:mb-4 sm:text-sm">
                        {quiniela.description}
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

                      {/* Date */}
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">
                        <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {new Date(quiniela.joinedAt).toLocaleDateString(
                          "es-ES",
                          {
                            day: "numeric",
                            month: "short",
                          },
                        )}
                      </span>

                      {/* Join Code */}
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary sm:rounded-md sm:px-2 sm:py-1 sm:text-xs">
                        {quiniela.joinCode}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {/* Add New Quiniela Card */}
          <Card className="group relative h-full overflow-hidden border-2 border-dashed border-border/50 bg-transparent transition-all duration-300 hover:border-primary/50 hover:bg-primary/5">
            <CardContent className="flex h-full min-h-[180px] flex-col items-center justify-center p-4 text-center sm:min-h-[200px] sm:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110 sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl">
                <Plus className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </div>
              <h3 className="mb-1 text-base font-semibold sm:text-lg">
                Nueva Quiniela
              </h3>
              <p className="mb-4 text-xs text-muted-foreground sm:mb-5 sm:text-sm">
                Crea o únete a una quiniela
              </p>
              <div className="flex w-full flex-col gap-2">
                <Button asChild size="sm" className="w-full gap-2">
                  <Link href="/quinielas/create">
                    <Plus className="h-4 w-4" />
                    Crear Quiniela
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                >
                  <Link href="/quinielas/join">
                    <Users className="h-4 w-4" />
                    Unirse a Quiniela
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

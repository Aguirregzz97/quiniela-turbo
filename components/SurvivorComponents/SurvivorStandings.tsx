"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Skull, Crown, Trophy, Users } from "lucide-react";
import Image from "next/image";

interface Participant {
  id: string;
  oderId: string; // Note: This is actually the userId, typo in the query alias
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  livesRemaining: number;
  isEliminated: boolean;
  eliminatedAtRound?: string | null;
  joinedAt: Date;
}

interface SurvivorStandingsProps {
  participants: Participant[];
  totalLives: number;
  currentUserId: string;
  ownerId: string;
}

export default function SurvivorStandings({
  participants,
  totalLives,
  currentUserId,
  ownerId,
}: SurvivorStandingsProps) {
  // Separate and sort participants
  const activeParticipants = participants
    .filter((p) => !p.isEliminated)
    .sort((a, b) => b.livesRemaining - a.livesRemaining);

  const eliminatedParticipants = participants
    .filter((p) => p.isEliminated)
    .sort((a, b) => {
      // Sort by joinedAt descending (most recently eliminated first)
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    });

  const totalCount = participants.length;
  const aliveCount = activeParticipants.length;
  const eliminatedCount = eliminatedParticipants.length;

  // Calculate survival rate
  const survivalRate =
    totalCount > 0 ? Math.round((aliveCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <Heart className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{aliveCount}</p>
              <p className="text-xs text-muted-foreground">Vivos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <Skull className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">
                {eliminatedCount}
              </p>
              <p className="text-xs text-muted-foreground">Eliminados</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Trophy className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">
                {survivalRate}%
              </p>
              <p className="text-xs text-muted-foreground">Supervivencia</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Players */}
      {activeParticipants.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-success/10">
              <Heart className="h-3.5 w-3.5 text-success" />
            </div>
            <h3 className="font-semibold">Jugadores Activos</h3>
            <Badge
              variant="secondary"
              className="ml-auto bg-success/10 text-success"
            >
              {aliveCount} vivos
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeParticipants.map((participant, index) => {
              const isCurrentUser = participant.oderId === currentUserId;
              const isOwner = participant.oderId === ownerId;

              return (
                <Card
                  key={participant.id}
                  className={`relative overflow-hidden border-border/50 transition-all ${
                    isCurrentUser ? "ring-2 ring-primary/50" : ""
                  }`}
                >
                  {/* Rank indicator for top 3 */}
                  {index < 3 && (
                    <div
                      className={`absolute left-0 top-0 h-full w-1 ${
                        index === 0
                          ? "bg-gold"
                          : index === 1
                            ? "bg-silver"
                            : "bg-bronze"
                      }`}
                    />
                  )}

                  <CardContent className="flex items-center gap-3 p-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted ring-2 ring-success/30">
                        <Image
                          src={participant.userImage || "/img/profile.png"}
                          alt={participant.userName || "Participante"}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      {isOwner && (
                        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold">
                          <Crown className="h-2.5 w-2.5 text-gold-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">
                          {participant.userName || "Sin nombre"}
                        </p>
                        {isCurrentUser && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1 text-[10px]"
                          >
                            Tú
                          </Badge>
                        )}
                      </div>
                      {/* Lives display */}
                      <div className="mt-1 flex items-center gap-1">
                        {Array.from({ length: totalLives }).map((_, i) => (
                          <Heart
                            key={i}
                            className={`h-3 w-3 ${
                              i < participant.livesRemaining
                                ? "fill-destructive text-destructive"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Lives count */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-bold text-success">
                        {participant.livesRemaining}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {participant.livesRemaining === 1 ? "vida" : "vidas"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Eliminated Players */}
      {eliminatedParticipants.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10">
              <Skull className="h-3.5 w-3.5 text-destructive" />
            </div>
            <h3 className="font-semibold text-muted-foreground">Eliminados</h3>
            <Badge
              variant="secondary"
              className="ml-auto bg-destructive/10 text-destructive"
            >
              {eliminatedCount} eliminados
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {eliminatedParticipants.map((participant) => {
              const isCurrentUser = participant.oderId === currentUserId;
              const isOwner = participant.oderId === ownerId;

              return (
                <Card
                  key={participant.id}
                  className={`relative overflow-hidden border-border/30 bg-muted/20 opacity-70 ${
                    isCurrentUser ? "ring-2 ring-destructive/30" : ""
                  }`}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted ring-2 ring-destructive/20">
                        <Image
                          src={participant.userImage || "/img/profile.png"}
                          alt={participant.userName || "Participante"}
                          fill
                          className="object-cover grayscale"
                          sizes="40px"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Skull className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      {isOwner && (
                        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold/50">
                          <Crown className="h-2.5 w-2.5 text-gold-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium line-through">
                          {participant.userName || "Sin nombre"}
                        </p>
                        {isCurrentUser && (
                          <Badge
                            variant="secondary"
                            className="h-4 bg-destructive/10 px-1 text-[10px] text-destructive"
                          >
                            Tú
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {participant.eliminatedAtRound
                          ? `Eliminado en ${participant.eliminatedAtRound}`
                          : "Eliminado"}
                      </p>
                    </div>

                    {/* Eliminated indicator */}
                    <div className="flex-shrink-0">
                      <Badge variant="destructive" className="gap-1">
                        <Skull className="h-3 w-3" />
                        OUT
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state when no participants */}
      {participants.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">
              No hay participantes aún
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Comparte el código de unión para invitar jugadores
            </p>
          </CardContent>
        </Card>
      )}

      {/* Winner state when only 1 player remains */}
      {aliveCount === 1 && eliminatedCount > 0 && (
        <Card className="overflow-hidden border-gold/50 bg-gradient-to-br from-gold/10 to-gold/5">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold/85 shadow-lg shadow-gold/30">
              <Trophy className="h-10 w-10 text-gold-foreground" />
            </div>
            <h3 className="mb-1 text-xl font-bold text-gold">
              ¡Tenemos un ganador!
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full ring-4 ring-gold/30">
                <Image
                  src={activeParticipants[0]?.userImage || "/img/profile.png"}
                  alt={activeParticipants[0]?.userName || "Ganador"}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {activeParticipants[0]?.userName || "Sin nombre"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Último sobreviviente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

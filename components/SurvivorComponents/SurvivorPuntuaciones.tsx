"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Skull, Crown, Trophy, Users, Loader2 } from "lucide-react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface SurvivorPuntuacionesProps {
  survivorGameId: string;
  currentUserId: string;
}

interface CalculatedParticipant {
  oderId: string;
  participantId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  livesRemaining: number;
  isEliminated: boolean;
  eliminatedAtRound?: string | null;
}

interface StandingsResponse {
  participants: CalculatedParticipant[];
  ownerId: string;
  totalLives: number;
}

export default function SurvivorPuntuaciones({
  survivorGameId,
  currentUserId,
}: SurvivorPuntuacionesProps) {
  const { data, isLoading, error } = useQuery<StandingsResponse>({
    queryKey: ["survivor-standings", survivorGameId],
    queryFn: async () => {
      const response = await fetch(`/api/survivor/${survivorGameId}/standings`);
      if (!response.ok) {
        throw new Error("Failed to fetch standings");
      }
      return response.json();
    },
    enabled: !!survivorGameId,
  });

  // Separate and sort participants
  const { activeParticipants, eliminatedParticipants } = useMemo(() => {
    if (!data?.participants) {
      return { activeParticipants: [], eliminatedParticipants: [] };
    }

    const active = data.participants
      .filter((p) => !p.isEliminated)
      .sort((a, b) => b.livesRemaining - a.livesRemaining);

    const eliminated = data.participants
      .filter((p) => p.isEliminated)
      .sort((a, b) => {
        // Sort by round if available
        if (a.eliminatedAtRound && b.eliminatedAtRound) {
          return b.eliminatedAtRound.localeCompare(a.eliminatedAtRound);
        }
        return 0;
      });

    return { activeParticipants: active, eliminatedParticipants: eliminated };
  }, [data?.participants]);

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Cargando clasificación...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
          <Users className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Error al cargar la clasificación
        </p>
      </div>
    );
  }

  const totalCount = data.participants.length;
  const aliveCount = activeParticipants.length;
  const eliminatedCount = eliminatedParticipants.length;
  const totalLives = data.totalLives;
  const ownerId = data.ownerId;

  if (totalCount === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
          <Users className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No hay participantes en este juego
        </p>
      </div>
    );
  }

  // Check for winner
  const hasWinner = aliveCount === 1 && eliminatedCount > 0;

  return (
    <div className="space-y-4">
      {/* Winner Banner */}
      {hasWinner && (
        <div className="flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 p-4">
          <Trophy className="h-6 w-6 text-amber-500" />
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-amber-500/50">
              <Image
                src={activeParticipants[0]?.userImage || "/img/profile.png"}
                alt={activeParticipants[0]?.userName || "Ganador"}
                fill
                className="object-cover"
                sizes="32px"
              />
            </div>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {activeParticipants[0]?.userName || "Sin nombre"} ganó!
            </span>
          </div>
          <Trophy className="h-6 w-6 text-amber-500" />
        </div>
      )}

      {/* Quick Stats */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Heart className="h-4 w-4 fill-green-500 text-green-500" />
          <span className="font-medium text-green-600">{aliveCount}</span>
          <span className="text-muted-foreground">vivos</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Skull className="h-4 w-4 text-red-500" />
          <span className="font-medium text-red-600">{eliminatedCount}</span>
          <span className="text-muted-foreground">eliminados</span>
        </div>
      </div>

      {/* Participants List */}
      <div className="space-y-2">
        {/* Active Players */}
        {activeParticipants.map((participant, index) => {
          const isCurrentUser = participant.oderId === currentUserId;
          const isOwner = participant.oderId === ownerId;

          return (
            <div
              key={participant.participantId}
              className={`flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 transition-all ${
                isCurrentUser ? "ring-2 ring-primary/30" : ""
              }`}
            >
              {/* Rank */}
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  index === 0
                    ? "bg-amber-500 text-white"
                    : index === 1
                      ? "bg-slate-400 text-white"
                      : index === 2
                        ? "bg-amber-700 text-white"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>

              {/* Avatar */}
              <div className="relative">
                <div className="relative h-8 w-8 overflow-hidden rounded-full bg-muted ring-2 ring-green-500/30">
                  <Image
                    src={participant.userImage || "/img/profile.png"}
                    alt={participant.userName || "Participante"}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
                {isOwner && (
                  <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500">
                    <Crown className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium">
                    {participant.userName || "Sin nombre"}
                  </p>
                  {isCurrentUser && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      Tú
                    </Badge>
                  )}
                </div>
              </div>

              {/* Lives */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalLives }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < participant.livesRemaining
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Eliminated Players */}
        {eliminatedParticipants.map((participant) => {
          const isCurrentUser = participant.oderId === currentUserId;
          const isOwner = participant.oderId === ownerId;

          return (
            <div
              key={participant.participantId}
              className={`flex items-center gap-3 rounded-lg border border-border/30 bg-muted/30 p-3 opacity-60 ${
                isCurrentUser ? "ring-2 ring-destructive/20" : ""
              }`}
            >
              {/* Skull icon instead of rank */}
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <Skull className="h-3.5 w-3.5 text-red-500" />
              </div>

              {/* Avatar */}
              <div className="relative">
                <div className="relative h-8 w-8 overflow-hidden rounded-full bg-muted ring-2 ring-red-500/20">
                  <Image
                    src={participant.userImage || "/img/profile.png"}
                    alt={participant.userName || "Participante"}
                    fill
                    className="object-cover grayscale"
                    sizes="32px"
                  />
                </div>
                {isOwner && (
                  <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500/50">
                    <Crown className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>

              {/* Name */}
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
                {participant.eliminatedAtRound && (
                  <p className="text-[10px] text-muted-foreground">
                    {participant.eliminatedAtRound}
                  </p>
                )}
              </div>

              {/* OUT badge */}
              <Badge
                variant="destructive"
                className="h-5 gap-0.5 px-1.5 text-[10px]"
              >
                <Skull className="h-2.5 w-2.5" />
                OUT
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

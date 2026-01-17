"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  History,
  ChevronDown,
  ChevronRight,
  Shield,
  Crown,
  Heart,
  Skull,
  Users,
} from "lucide-react";
import Image from "next/image";
import {
  useAllSurvivorPicks,
  SurvivorPickWithUser,
} from "@/hooks/survivor/useAllSurvivorPicks";

interface Participant {
  id: string;
  oderId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  livesRemaining: number;
  isEliminated: boolean;
  eliminatedAtRound?: string | null;
  joinedAt: Date;
}

interface SurvivorPickHistoryProps {
  survivorGameId: string;
  participants: Participant[];
  roundsSelected: { roundName: string; dates: string[] }[];
  currentUserId: string;
  ownerId: string;
}

// Group picks by user
function groupPicksByUser(
  picks: SurvivorPickWithUser[],
): Map<string, SurvivorPickWithUser[]> {
  const grouped = new Map<string, SurvivorPickWithUser[]>();

  for (const pick of picks) {
    const existing = grouped.get(pick.userId) || [];
    existing.push(pick);
    grouped.set(pick.userId, existing);
  }

  // Sort each user's picks by round
  for (const [userId, userPicks] of grouped) {
    grouped.set(
      userId,
      userPicks.sort((a, b) => {
        // Try to extract round number for sorting
        const numA = extractRoundNumber(a.externalRound);
        const numB = extractRoundNumber(b.externalRound);
        return numA - numB;
      }),
    );
  }

  return grouped;
}

// Extract round number from round string (e.g., "Regular Season - 10" -> 10)
function extractRoundNumber(round: string): number {
  const match = round.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export default function SurvivorPickHistory({
  survivorGameId,
  participants,
  roundsSelected,
  currentUserId,
  ownerId,
}: SurvivorPickHistoryProps) {
  const { data: picks, isLoading, error } = useAllSurvivorPicks(survivorGameId);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const picksByUser = useMemo(() => {
    if (!picks) return new Map<string, SurvivorPickWithUser[]>();
    return groupPicksByUser(picks);
  }, [picks]);

  const toggleUser = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Get participant info by userId
  const getParticipantInfo = (userId: string) => {
    return participants.find((p) => p.oderId === userId);
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Cargando historial de picks...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-destructive">
            Error al cargar el historial de picks
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!picks || picks.length === 0) {
    return (
      <Card className="border-dashed border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <History className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-muted-foreground">
            No hay picks registrados aún
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Los picks aparecerán aquí cuando los jugadores seleccionen equipos
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort participants: current user first, then by number of picks, then alphabetically
  const sortedParticipants = [...participants].sort((a, b) => {
    // Current user first
    if (a.oderId === currentUserId) return -1;
    if (b.oderId === currentUserId) return 1;

    // Then by number of picks (descending)
    const picksA = picksByUser.get(a.oderId)?.length || 0;
    const picksB = picksByUser.get(b.oderId)?.length || 0;
    if (picksB !== picksA) return picksB - picksA;

    // Then alphabetically
    return (a.userName || "").localeCompare(b.userName || "");
  });

  return (
    <div className="space-y-3">
      {sortedParticipants.map((participant) => {
        const userPicks = picksByUser.get(participant.oderId) || [];
        const isExpanded = expandedUsers.has(participant.oderId);
        const isCurrentUser = participant.oderId === currentUserId;
        const isOwner = participant.oderId === ownerId;

        return (
          <Collapsible
            key={participant.id}
            open={isExpanded}
            onOpenChange={() => toggleUser(participant.oderId)}
          >
            <Card
              className={`overflow-hidden border-border/50 transition-all ${
                isCurrentUser ? "ring-2 ring-primary/30" : ""
              } ${participant.isEliminated ? "opacity-70" : ""}`}
            >
              <CollapsibleTrigger className="w-full">
                <CardContent className="flex items-center gap-3 p-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div
                      className={`relative h-10 w-10 overflow-hidden rounded-full bg-muted ring-2 ${
                        participant.isEliminated
                          ? "ring-red-500/30"
                          : "ring-green-500/30"
                      }`}
                    >
                      <Image
                        src={participant.userImage || "/img/profile.png"}
                        alt={participant.userName || "Participante"}
                        fill
                        className={`object-cover ${participant.isEliminated ? "grayscale" : ""}`}
                        sizes="40px"
                      />
                      {participant.isEliminated && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Skull className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    {isOwner && (
                      <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                        <Crown className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`truncate text-sm font-medium ${participant.isEliminated ? "line-through text-muted-foreground" : ""}`}
                      >
                        {participant.userName || "Sin nombre"}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          Tú
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {userPicks.length} pick{userPicks.length !== 1 ? "s" : ""}
                      </span>
                      {!participant.isEliminated && (
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-red-500" />
                          {participant.livesRemaining} vida
                          {participant.livesRemaining !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand indicator */}
                  <div className="flex items-center gap-2">
                    {userPicks.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {userPicks.length} jornada
                        {userPicks.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
                  {userPicks.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Aún no ha seleccionado ningún equipo
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userPicks.map((pick) => (
                        <div
                          key={pick.id}
                          className="flex items-center gap-3 rounded-lg bg-background/50 p-3"
                        >
                          {/* Team logo */}
                          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5">
                            <Image
                              src={`https://media.api-sports.io/football/teams/${pick.externalPickedTeamId}.png`}
                              alt={pick.externalPickedTeamName}
                              fill
                              className="object-contain p-0.5"
                              sizes="32px"
                            />
                          </div>

                          {/* Pick info */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {pick.externalPickedTeamName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRoundName(pick.externalRound)}
                            </p>
                          </div>

                          {/* Round badge */}
                          <Badge variant="secondary" className="flex-shrink-0 text-xs">
                            J{extractRoundNumber(pick.externalRound)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}

// Format round name for display
function formatRoundName(round: string): string {
  // "Regular Season - 10" -> "Jornada 10"
  const num = extractRoundNumber(round);
  if (num > 0) {
    return `Jornada ${num}`;
  }
  return round;
}


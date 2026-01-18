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
  Check,
  X,
  Minus,
  Clock,
} from "lucide-react";
import Image from "next/image";
import {
  useAllSurvivorPicks,
  SurvivorPickWithUser,
} from "@/hooks/survivor/useAllSurvivorPicks";
import { useQueries } from "@tanstack/react-query";
import { FixtureData } from "@/types/fixtures";
import axios from "axios";

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
  externalLeagueId: string;
  externalSeason: string;
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
  externalLeagueId,
  externalSeason,
}: SurvivorPickHistoryProps) {
  const { data: picks, isLoading, error } = useAllSurvivorPicks(survivorGameId);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const picksByUser = useMemo(() => {
    if (!picks) return new Map<string, SurvivorPickWithUser[]>();
    return groupPicksByUser(picks);
  }, [picks]);

  // Get unique rounds from picks to fetch fixtures
  const roundsWithPicks = useMemo(() => {
    if (!picks) return [];
    const rounds = [...new Set(picks.map((p) => p.externalRound))];
    return rounds.sort((a, b) => extractRoundNumber(a) - extractRoundNumber(b));
  }, [picks]);

  // Fetch fixtures for all rounds that have picks using useQueries
  const fixtureQueries = useQueries({
    queries: roundsWithPicks.map((roundName) => ({
      queryKey: ["round-fixtures", externalLeagueId, externalSeason, roundName],
      queryFn: async (): Promise<FixtureData[]> => {
        try {
          const response = await axios.get("/api/football/fixtures", {
            params: {
              league: externalLeagueId,
              season: externalSeason,
              round: roundName,
            },
          });
          return response.data.response || [];
        } catch {
          return [];
        }
      },
      staleTime: 5 * 60 * 1000,
      enabled: !!externalLeagueId && !!externalSeason && !!roundName,
    })),
  });

  // Create a map of fixtureId -> fixture data
  const fixturesMap = useMemo(() => {
    const map = new Map<string, FixtureData>();
    fixtureQueries.forEach((query) => {
      if (query.data) {
        query.data.forEach((fixture) => {
          map.set(fixture.fixture.id.toString(), fixture);
        });
      }
    });
    return map;
  }, [fixtureQueries]);

  const fixturesLoading = fixtureQueries.some((q) => q.isLoading);

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
                  ) : fixturesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userPicks.map((pick) => {
                        const fixture = fixturesMap.get(pick.externalFixtureId);
                        const isPickedTeamHome =
                          fixture?.teams.home.id.toString() ===
                          pick.externalPickedTeamId;

                        // Determine pick result
                        let pickResult: "win" | "draw" | "loss" | "pending" =
                          "pending";
                        if (fixture) {
                          const status = fixture.fixture.status.short;
                          if (["FT", "AET", "PEN"].includes(status)) {
                            const pickedTeam = isPickedTeamHome
                              ? fixture.teams.home
                              : fixture.teams.away;
                            if (pickedTeam.winner === null) {
                              pickResult = "draw";
                            } else if (pickedTeam.winner === true) {
                              pickResult = "win";
                            } else {
                              pickResult = "loss";
                            }
                          }
                        }

                        return (
                          <div
                            key={pick.id}
                            className={`rounded-lg bg-background/50 p-3 ${
                              pickResult === "loss"
                                ? "ring-1 ring-red-500/30"
                                : pickResult === "win"
                                  ? "ring-1 ring-green-500/30"
                                  : pickResult === "draw"
                                    ? "ring-1 ring-amber-500/30"
                                    : ""
                            }`}
                          >
                            {/* Round header */}
                            <div className="mb-2 flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className="text-xs font-medium"
                              >
                                {formatRoundName(pick.externalRound)}
                              </Badge>
                              {pickResult !== "pending" && (
                                <Badge
                                  className={`gap-1 text-xs ${
                                    pickResult === "win"
                                      ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                      : pickResult === "draw"
                                        ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                                        : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                                  }`}
                                  variant="secondary"
                                >
                                  {pickResult === "win" ? (
                                    <>
                                      <Check className="h-3 w-3" /> Ganó
                                    </>
                                  ) : pickResult === "draw" ? (
                                    <>
                                      <Minus className="h-3 w-3" /> Empate
                                    </>
                                  ) : (
                                    <>
                                      <X className="h-3 w-3" /> Perdió
                                    </>
                                  )}
                                </Badge>
                              )}
                              {pickResult === "pending" && (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 text-xs"
                                >
                                  <Clock className="h-3 w-3" /> Pendiente
                                </Badge>
                              )}
                            </div>

                            {/* Fixture display */}
                            {fixture ? (
                              <div className="flex items-center justify-center gap-2">
                                {/* Home team */}
                                <div className="flex flex-1 justify-end">
                                  <div
                                    className={`flex items-center gap-2 ${
                                      isPickedTeamHome
                                        ? "rounded-lg bg-primary/10 px-2 py-1"
                                        : ""
                                    }`}
                                  >
                                    <span
                                      className={`truncate text-xs sm:text-sm ${
                                        isPickedTeamHome ? "font-semibold" : ""
                                      }`}
                                    >
                                      {fixture.teams.home.name}
                                    </span>
                                    <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded bg-white p-0.5 shadow-sm ring-1 ring-black/5 sm:h-8 sm:w-8">
                                      <Image
                                        src={fixture.teams.home.logo}
                                        alt={fixture.teams.home.name}
                                        fill
                                        className="object-contain"
                                        sizes="32px"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Score */}
                                <div className="flex-shrink-0 rounded-lg bg-muted px-2 py-1 text-center">
                                  {["FT", "AET", "PEN"].includes(
                                    fixture.fixture.status.short,
                                  ) ? (
                                    <span className="text-sm font-bold">
                                      {fixture.goals.home} - {fixture.goals.away}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      vs
                                    </span>
                                  )}
                                </div>

                                {/* Away team */}
                                <div className="flex flex-1 justify-start">
                                  <div
                                    className={`flex items-center gap-2 ${
                                      !isPickedTeamHome
                                        ? "rounded-lg bg-primary/10 px-2 py-1"
                                        : ""
                                    }`}
                                  >
                                    <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded bg-white p-0.5 shadow-sm ring-1 ring-black/5 sm:h-8 sm:w-8">
                                      <Image
                                        src={fixture.teams.away.logo}
                                        alt={fixture.teams.away.name}
                                        fill
                                        className="object-contain"
                                        sizes="32px"
                                      />
                                    </div>
                                    <span
                                      className={`truncate text-xs sm:text-sm ${
                                        !isPickedTeamHome ? "font-semibold" : ""
                                      }`}
                                    >
                                      {fixture.teams.away.name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Fallback if fixture not found */
                              <div className="flex items-center gap-3">
                                <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5">
                                  <Image
                                    src={`https://media.api-sports.io/football/teams/${pick.externalPickedTeamId}.png`}
                                    alt={pick.externalPickedTeamName}
                                    fill
                                    className="object-contain p-0.5"
                                    sizes="32px"
                                  />
                                </div>
                                <span className="text-sm font-medium">
                                  {pick.externalPickedTeamName}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
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


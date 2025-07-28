"use client";

import { useState, useMemo } from "react";
import { useFixtures } from "@/hooks/api-football/useFixtures";
import { useAllPredictions } from "@/hooks/predictions/useAllPredictions";
import { getFixturesParamsFromQuiniela } from "@/utils/quinielaHelpers";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Trophy,
  Check,
  X,
  Minus,
} from "lucide-react";
import Image from "next/image";
import { Quiniela } from "@/db/schema";
import { FixtureData } from "@/types/fixtures";
import { AllPredictionsData } from "@/hooks/predictions/useAllPredictions";

interface AllPredictionsTableProps {
  quiniela: Quiniela;
  userId: string;
  exactPoints?: number;
  correctResultPoints?: number;
}

interface UserStats {
  exact: number;
  correctResult: number;
  miss: number;
  noPrediction: number;
  totalPoints: number;
}

// Helper function to determine the default active round
function getDefaultActiveRound(
  rounds: { roundName: string; dates: string[] }[],
): string {
  if (!rounds.length) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const round of rounds) {
    if (round.dates.length === 0) continue;

    const roundStart = new Date(round.dates[0]);
    const roundEnd = new Date(round.dates[round.dates.length - 1]);
    roundStart.setHours(0, 0, 0, 0);
    roundEnd.setHours(23, 59, 59, 999);

    if (today >= roundStart && today <= roundEnd) {
      return round.roundName;
    }
  }

  const firstRound = rounds[0];
  const lastRound = rounds[rounds.length - 1];
  const firstRoundStart = new Date(firstRound.dates[0]);
  const lastRoundEnd = new Date(lastRound.dates[lastRound.dates.length - 1]);

  if (today < firstRoundStart) {
    return firstRound.roundName;
  } else if (today > lastRoundEnd) {
    return lastRound.roundName;
  }

  return firstRound.roundName;
}

// Helper function to filter fixtures by round
function filterFixturesByRound(
  fixtures: FixtureData[] | undefined,
  roundName: string,
): FixtureData[] {
  if (!fixtures) return [];
  return fixtures.filter((fixture) => fixture.league.round === roundName);
}

// Helper function to evaluate prediction accuracy
function evaluatePrediction(
  prediction: {
    predictedHomeScore: number | null;
    predictedAwayScore: number | null;
  },
  actualResult: { homeScore: number | null; awayScore: number | null },
  matchFinished: boolean,
  exactPoints: number = 2,
  correctResultPoints: number = 1,
): {
  type: "exact" | "correct-result" | "miss" | "no-prediction";
  bgColor: string;
  textColor: string;
  points: number;
} {
  // No prediction case
  if (
    prediction.predictedHomeScore === null ||
    prediction.predictedAwayScore === null
  ) {
    return {
      type: "no-prediction",
      bgColor: "bg-gray-100",
      textColor: "text-gray-500",
      points: 0,
    };
  }

  // Match not finished yet - treat as no prediction for now
  if (
    !matchFinished ||
    actualResult.homeScore === null ||
    actualResult.awayScore === null
  ) {
    return {
      type: "no-prediction",
      bgColor: "bg-gray-100",
      textColor: "text-gray-500",
      points: 0,
    };
  }

  const predictedHome = prediction.predictedHomeScore;
  const predictedAway = prediction.predictedAwayScore;
  const actualHome = actualResult.homeScore;
  const actualAway = actualResult.awayScore;

  // Exact prediction
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return {
      type: "exact",
      bgColor: "bg-green-500",
      textColor: "text-white",
      points: exactPoints,
    };
  }

  // Correct result (winner)
  const predictedWinner =
    predictedHome > predictedAway
      ? "home"
      : predictedHome < predictedAway
        ? "away"
        : "draw";
  const actualWinner =
    actualHome > actualAway
      ? "home"
      : actualHome < actualAway
        ? "away"
        : "draw";

  if (predictedWinner === actualWinner) {
    return {
      type: "correct-result",
      bgColor: "bg-green-300",
      textColor: "text-green-900",
      points: correctResultPoints,
    };
  }

  // Miss
  return {
    type: "miss",
    bgColor: "bg-red-300",
    textColor: "text-red-900",
    points: 0,
  };
}

// Helper to group predictions by user
function groupPredictionsByUser(
  predictions: AllPredictionsData[],
): Map<string, AllPredictionsData[]> {
  const grouped = new Map<string, AllPredictionsData[]>();

  predictions.forEach((prediction) => {
    const userId = prediction.userId;
    if (!grouped.has(userId)) {
      grouped.set(userId, []);
    }
    grouped.get(userId)!.push(prediction);
  });

  return grouped;
}

// Helper function to format match result
function getMatchResult(fixture: FixtureData): string {
  if (fixture.fixture.status.short === "NS") {
    return "vs";
  }
  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;
  return `${homeGoals}-${awayGoals}`;
}

export default function AllPredictionsTable({
  quiniela,
  userId,
  exactPoints = 2,
  correctResultPoints = 1,
}: AllPredictionsTableProps) {
  const fixturesParams = getFixturesParamsFromQuiniela(quiniela);

  const {
    data: fixturesData,
    isLoading: fixturesLoading,
    error: fixturesError,
  } = useFixtures(
    fixturesParams.leagueId,
    fixturesParams.season,
    fixturesParams.fromDate,
    fixturesParams.toDate,
  );

  const {
    data: allPredictions = [],
    isLoading: predictionsLoading,
    error: predictionsError,
  } = useAllPredictions(quiniela.id);

  // Get available rounds from quiniela data
  const availableRounds = quiniela.roundsSelected || [];

  // Determine default active round
  const defaultRound = getDefaultActiveRound(availableRounds);
  const [selectedRound, setSelectedRound] = useState<string>(defaultRound);

  // Filter fixtures by selected round
  const roundFixtures = useMemo(() => {
    return filterFixturesByRound(fixturesData?.response, selectedRound);
  }, [fixturesData?.response, selectedRound]);

  // Filter predictions by selected round and group by user
  const roundPredictions = useMemo(() => {
    const filtered = allPredictions.filter(
      (p) => p.externalRound === selectedRound,
    );
    return groupPredictionsByUser(filtered);
  }, [allPredictions, selectedRound]);

  // Get unique users who have predictions
  const usersWithPredictions = useMemo(() => {
    const users = new Map<
      string,
      {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
      }
    >();

    allPredictions.forEach((prediction) => {
      if (!users.has(prediction.userId)) {
        users.set(prediction.userId, {
          id: prediction.userId,
          name: prediction.userName,
          email: prediction.userEmail,
          image: prediction.userImage,
        });
      }
    });

    return Array.from(users.values()).sort((a, b) =>
      (a.name || a.email || "").localeCompare(b.name || b.email || ""),
    );
  }, [allPredictions]);

  // Calculate user scores and stats
  const userStats = useMemo(() => {
    const stats = new Map<string, UserStats>();

    usersWithPredictions.forEach((user) => {
      let totalPoints = 0;
      let exact = 0;
      let correctResult = 0;
      let miss = 0;
      let noPrediction = 0;

      const userPredictions = roundPredictions.get(user.id) || [];

      roundFixtures.forEach((fixture) => {
        const prediction = userPredictions.find(
          (p) => p.externalFixtureId === fixture.fixture.id.toString(),
        );
        const actualResult = {
          homeScore: fixture.goals.home,
          awayScore: fixture.goals.away,
        };
        const matchFinished =
          fixture.fixture.status.short === "FT" ||
          fixture.fixture.status.short === "AET" ||
          fixture.fixture.status.short === "PEN";

        const evaluation = evaluatePrediction(
          prediction
            ? {
                predictedHomeScore: prediction.predictedHomeScore,
                predictedAwayScore: prediction.predictedAwayScore,
              }
            : {
                predictedHomeScore: null,
                predictedAwayScore: null,
              },
          actualResult,
          matchFinished,
          exactPoints,
          correctResultPoints,
        );

        totalPoints += evaluation.points;

        switch (evaluation.type) {
          case "exact":
            exact++;
            break;
          case "correct-result":
            correctResult++;
            break;
          case "miss":
            miss++;
            break;
          case "no-prediction":
            noPrediction++;
            break;
        }
      });

      stats.set(user.id, {
        exact,
        correctResult,
        miss,
        noPrediction,
        totalPoints,
      });
    });

    return stats;
  }, [usersWithPredictions, roundPredictions, roundFixtures]);

  // Sort users by points (descending)
  const sortedUsers = useMemo(() => {
    return [...usersWithPredictions].sort((a, b) => {
      const aStats = userStats.get(a.id);
      const bStats = userStats.get(b.id);
      const aPoints = aStats?.totalPoints || 0;
      const bPoints = bStats?.totalPoints || 0;
      return bPoints - aPoints;
    });
  }, [usersWithPredictions, userStats]);

  // State to manage which cards are open
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  if (fixturesLoading || predictionsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Cargando pronósticos...</div>
      </div>
    );
  }

  if (fixturesError || predictionsError) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error al cargar los datos</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Round Selector Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Pronósticos de Participantes
          </h2>
          {roundFixtures.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {roundFixtures.length} partidos • {sortedUsers.length}{" "}
              participantes
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Jornada:</span>
          <Select value={selectedRound} onValueChange={setSelectedRound}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Seleccionar jornada" />
            </SelectTrigger>
            <SelectContent>
              {availableRounds.map((round) => (
                <SelectItem key={round.roundName} value={round.roundName}>
                  {round.roundName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-0">
            <span className="block text-sm font-medium sm:mr-4 sm:inline">
              Leyenda:
            </span>
            <div className="grid grid-cols-2 gap-3 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-green-600" />
                  <div className="h-4 w-6 rounded bg-green-500"></div>
                </div>
                <span className="text-xs sm:text-sm">
                  Exacto ({exactPoints} pts)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-green-900" />
                  <div className="h-4 w-6 rounded bg-green-300"></div>
                </div>
                <span className="text-xs sm:text-sm">
                  Resultado ({correctResultPoints} pt)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <X className="h-4 w-4 text-red-900" />
                  <div className="h-4 w-6 rounded bg-red-300"></div>
                </div>
                <span className="text-xs sm:text-sm">Error</span>
              </div>

              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <div className="flex items-center gap-1">
                  <Minus className="h-4 w-4 text-gray-500" />
                  <div className="h-4 w-6 rounded bg-gray-100"></div>
                </div>
                <span className="text-xs sm:text-sm">Sin pronóstico</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Cards */}
      {roundFixtures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No hay partidos disponibles para esta jornada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {sortedUsers.map((user, index) => {
            const userPredictions = roundPredictions.get(user.id) || [];
            const stats = userStats.get(user.id);
            const isOpen = openCards[user.id] || false;

            if (!stats) return null;

            return (
              <Collapsible
                key={user.id}
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenCards((prev) => ({ ...prev, [user.id]: open }))
                }
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="h-auto w-full p-0">
                      <CardHeader className="w-full p-4">
                        <div className="flex items-center justify-between">
                          {/* User Info */}
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 flex-shrink-0 sm:h-10 sm:w-10">
                              <AvatarImage
                                src={user.image || undefined}
                                alt={user.name || user.email || "User"}
                              />
                              <AvatarFallback className="bg-primary/10 text-sm font-medium">
                                {(user.name ||
                                  user.email ||
                                  "?")[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 text-left">
                              <h3 className="truncate text-base font-semibold sm:text-lg">
                                {user.name || user.email}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      index < 3 ? "default" : "secondary"
                                    }
                                    className={`px-2 py-1 text-sm font-bold ${
                                      index === 0
                                        ? "bg-yellow-500 text-yellow-900 hover:bg-yellow-600"
                                        : index === 1
                                          ? "bg-gray-400 text-gray-900 hover:bg-gray-500"
                                          : index === 2
                                            ? "bg-amber-600 text-amber-100 hover:bg-amber-700"
                                            : ""
                                    }`}
                                  >
                                    #{index + 1}
                                  </Badge>
                                </div>
                                <div className="rounded-lg border border-primary/20 bg-primary/15 px-1.5 py-1">
                                  <span className="text-base font-bold text-primary">
                                    {stats.totalPoints}
                                  </span>
                                  <span className="ml-1 text-sm text-muted-foreground">
                                    pts
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Stats Summary */}
                          <div className="flex items-center gap-3">
                            <div className="hidden items-center gap-3 text-sm sm:flex">
                              {stats.exact > 0 && (
                                <div className="flex items-center gap-1">
                                  <Trophy className="h-3 w-3 text-green-600" />
                                  <span className="font-medium">
                                    {stats.exact}
                                  </span>
                                </div>
                              )}
                              {stats.correctResult > 0 && (
                                <div className="flex items-center gap-1">
                                  <Check className="h-3 w-3 text-green-800" />
                                  <span className="font-medium">
                                    {stats.correctResult}
                                  </span>
                                </div>
                              )}
                              {stats.miss > 0 && (
                                <div className="flex items-center gap-1">
                                  <X className="h-3 w-3 text-red-800" />
                                  <span className="font-medium">
                                    {stats.miss}
                                  </span>
                                </div>
                              )}

                              {stats.noPrediction > 0 && (
                                <div className="flex items-center gap-1">
                                  <Minus className="h-3 w-3 text-gray-500" />
                                  <span className="font-medium">
                                    {stats.noPrediction}
                                  </span>
                                </div>
                              )}
                            </div>

                            {isOpen ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Mobile Stats Summary */}
                        <div className="mt-4 border-t border-border pt-3 sm:hidden">
                          <div className="flex items-center justify-center gap-4 text-sm">
                            {stats.exact > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Trophy className="h-4 w-4 text-green-600" />
                                <span className="font-medium">
                                  {stats.exact}
                                </span>
                              </div>
                            )}
                            {stats.correctResult > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-green-800" />
                                <span className="font-medium">
                                  {stats.correctResult}
                                </span>
                              </div>
                            )}
                            {stats.miss > 0 && (
                              <div className="flex items-center gap-1.5">
                                <X className="h-4 w-4 text-red-800" />
                                <span className="font-medium">
                                  {stats.miss}
                                </span>
                              </div>
                            )}

                            {stats.noPrediction > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Minus className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">
                                  {stats.noPrediction}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="mt-3 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {roundFixtures.map((fixture) => {
                          const prediction = userPredictions.find(
                            (p) =>
                              p.externalFixtureId ===
                              fixture.fixture.id.toString(),
                          );
                          const actualResult = {
                            homeScore: fixture.goals.home,
                            awayScore: fixture.goals.away,
                          };
                          const matchFinished =
                            fixture.fixture.status.short === "FT" ||
                            fixture.fixture.status.short === "AET" ||
                            fixture.fixture.status.short === "PEN";

                          const evaluation = evaluatePrediction(
                            prediction
                              ? {
                                  predictedHomeScore:
                                    prediction.predictedHomeScore,
                                  predictedAwayScore:
                                    prediction.predictedAwayScore,
                                }
                              : {
                                  predictedHomeScore: null,
                                  predictedAwayScore: null,
                                },
                            actualResult,
                            matchFinished,
                            exactPoints,
                            correctResultPoints,
                          );

                          return (
                            <div
                              key={fixture.fixture.id}
                              className={`rounded-lg border pb-2 pt-3 ${evaluation.bgColor} ${evaluation.textColor}`}
                            >
                              {/* Teams and Result */}
                              <div className="flex flex-col items-center gap-2">
                                {/* Team Logos */}
                                <div className="flex items-center gap-4">
                                  <Image
                                    src={fixture.teams.home.logo}
                                    alt={fixture.teams.home.name}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 object-contain"
                                  />
                                  <span className="text-sm font-medium">
                                    vs
                                  </span>
                                  <Image
                                    src={fixture.teams.away.logo}
                                    alt={fixture.teams.away.name}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 object-contain"
                                  />
                                </div>

                                {/* Actual Result */}
                                <div className="text-center">
                                  <div className="font-mono text-lg font-bold">
                                    {getMatchResult(fixture)}
                                  </div>
                                </div>

                                {/* User Prediction */}
                                <div className="text-center">
                                  <div className="mb-1 text-xs text-muted-foreground">
                                    Tu pronóstico:
                                  </div>
                                  <div className="font-mono text-sm font-medium">
                                    {prediction &&
                                    prediction.predictedHomeScore !== null &&
                                    prediction.predictedAwayScore !== null
                                      ? `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`
                                      : "−"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { Quiniela } from "@/db/schema";
import { FixtureData } from "@/types/fixtures";
import { AllPredictionsData } from "@/hooks/predictions/useAllPredictions";
import { getDefaultActiveRound } from "./RegistrarPronosticos";

interface VerPronosticosProps {
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
      bgColor: "bg-secondary",
      textColor: "text-foreground",
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
      bgColor: "bg-secondary",
      textColor: "text-foreground",
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
    return "";
  }
  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;
  return `${homeGoals}-${awayGoals}`;
}

export default function VerPronosticos({
  quiniela,
  userId,
  exactPoints = 2,
  correctResultPoints = 1,
}: VerPronosticosProps) {
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
  }, [
    usersWithPredictions,
    roundPredictions,
    roundFixtures,
    exactPoints,
    correctResultPoints,
  ]);

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
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          Cargando pronósticos...
        </p>
      </div>
    );
  }

  if (fixturesError || predictionsError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="mt-3 text-sm text-destructive">
          Error al cargar los datos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Round Selector Header */}
      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Pronósticos de Participantes</h2>
              {roundFixtures.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {roundFixtures.length} partidos • {sortedUsers.length}{" "}
                  participantes
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Jornada:</span>
            <Select value={selectedRound} onValueChange={setSelectedRound}>
              <SelectTrigger className="w-40 border-border/50">
                <SelectValue placeholder="Seleccionar jornada" />
              </SelectTrigger>
              <SelectContent>
                {availableRounds.map(
                  (round: { roundName: string; dates: string[] }) => (
                    <SelectItem key={round.roundName} value={round.roundName}>
                      {round.roundName}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Leyenda:
            </span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-500">
                  <Trophy className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs">Exacto ({exactPoints} pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-300">
                  <Check className="h-3.5 w-3.5 text-green-900" />
                </div>
                <span className="text-xs">
                  Resultado ({correctResultPoints} pt)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-300">
                  <X className="h-3.5 w-3.5 text-red-900" />
                </div>
                <span className="text-xs">Incorrecto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary">
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-xs">Sin pronóstico</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Cards */}
      {roundFixtures.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No hay partidos disponibles para esta jornada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedUsers.map((user, index) => {
            const userPredictions = roundPredictions.get(user.id) || [];
            const stats = userStats.get(user.id);
            const isOpen = openCards[user.id] || false;
            const isTopThree = index < 3;

            if (!stats) return null;

            return (
              <Collapsible
                key={user.id}
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenCards((prev) => ({ ...prev, [user.id]: open }))
                }
              >
                <Card
                  className={`border-border/50 transition-all duration-200 ${
                    isOpen ? "ring-1 ring-primary/20" : "hover:border-border"
                  }`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto w-full p-0 hover:bg-transparent"
                    >
                      <CardHeader className="w-full p-4">
                        <div className="flex items-center justify-between gap-4">
                          {/* User Info */}
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {/* Position Badge */}
                            <div
                              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                index === 0
                                  ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900 shadow-sm shadow-yellow-500/30"
                                  : index === 1
                                    ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 shadow-sm shadow-gray-400/30"
                                    : index === 2
                                      ? "bg-gradient-to-br from-amber-500 to-amber-600 text-amber-100 shadow-sm shadow-amber-500/30"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              #{index + 1}
                            </div>

                            <Avatar
                              className={`h-10 w-10 flex-shrink-0 ring-2 ${
                                index === 0
                                  ? "ring-yellow-400/50"
                                  : index === 1
                                    ? "ring-gray-400/50"
                                    : index === 2
                                      ? "ring-amber-500/50"
                                      : "ring-border/50"
                              }`}
                            >
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
                              <h3 className="truncate text-sm font-semibold sm:text-base">
                                {user.name || user.email}
                              </h3>
                              <div className="mt-1 flex items-center gap-2">
                                <span
                                  className={`text-lg font-bold tabular-nums ${isTopThree ? "text-primary" : "text-foreground"}`}
                                >
                                  {stats.totalPoints}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  pts
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stats Summary - Desktop */}
                          <div className="hidden items-center gap-2 sm:flex">
                            {stats.exact > 0 && (
                              <div className="flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-1">
                                <Trophy className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-xs font-semibold text-green-600">
                                  {stats.exact}
                                </span>
                              </div>
                            )}
                            {stats.correctResult > 0 && (
                              <div className="flex items-center gap-1 rounded-md bg-green-300/20 px-2 py-1">
                                <Check className="h-3.5 w-3.5 text-green-700" />
                                <span className="text-xs font-semibold text-green-700">
                                  {stats.correctResult}
                                </span>
                              </div>
                            )}
                            {stats.miss > 0 && (
                              <div className="flex items-center gap-1 rounded-md bg-red-300/20 px-2 py-1">
                                <X className="h-3.5 w-3.5 text-red-600" />
                                <span className="text-xs font-semibold text-red-600">
                                  {stats.miss}
                                </span>
                              </div>
                            )}
                            {stats.noPrediction > 0 && (
                              <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {stats.noPrediction}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Matches count and chevron */}
                          <div className="flex items-center gap-2">
                            <span className="hidden text-xs text-muted-foreground sm:inline">
                              {roundFixtures.length}
                            </span>
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${isOpen ? "bg-primary/10" : "bg-muted/50"}`}
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-primary" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Stats Summary */}
                        <div className="mt-3 flex items-center justify-center gap-2 border-t border-border/50 pt-3 sm:hidden">
                          {stats.exact > 0 && (
                            <div className="flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-1">
                              <Trophy className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-xs font-semibold text-green-600">
                                {stats.exact}
                              </span>
                            </div>
                          )}
                          {stats.correctResult > 0 && (
                            <div className="flex items-center gap-1 rounded-md bg-green-300/20 px-2 py-1">
                              <Check className="h-3.5 w-3.5 text-green-700" />
                              <span className="text-xs font-semibold text-green-700">
                                {stats.correctResult}
                              </span>
                            </div>
                          )}
                          {stats.miss > 0 && (
                            <div className="flex items-center gap-1 rounded-md bg-red-300/20 px-2 py-1">
                              <X className="h-3.5 w-3.5 text-red-600" />
                              <span className="text-xs font-semibold text-red-600">
                                {stats.miss}
                              </span>
                            </div>
                          )}
                          {stats.noPrediction > 0 && (
                            <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-semibold text-muted-foreground">
                                {stats.noPrediction}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="border-t border-border/50 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {(() => {
                          // Sort fixtures by prediction evaluation type
                          const sortedFixtures = [...roundFixtures].sort(
                            (a, b) => {
                              const aPrediction = userPredictions.find(
                                (p) =>
                                  p.externalFixtureId ===
                                  a.fixture.id.toString(),
                              );
                              const bPrediction = userPredictions.find(
                                (p) =>
                                  p.externalFixtureId ===
                                  b.fixture.id.toString(),
                              );

                              const aResult = {
                                homeScore: a.goals.home,
                                awayScore: a.goals.away,
                              };
                              const bResult = {
                                homeScore: b.goals.home,
                                awayScore: b.goals.away,
                              };

                              const aFinished =
                                a.fixture.status.short === "FT" ||
                                a.fixture.status.short === "AET" ||
                                a.fixture.status.short === "PEN";
                              const bFinished =
                                b.fixture.status.short === "FT" ||
                                b.fixture.status.short === "AET" ||
                                b.fixture.status.short === "PEN";

                              const aEvaluation = evaluatePrediction(
                                aPrediction
                                  ? {
                                      predictedHomeScore:
                                        aPrediction.predictedHomeScore,
                                      predictedAwayScore:
                                        aPrediction.predictedAwayScore,
                                    }
                                  : {
                                      predictedHomeScore: null,
                                      predictedAwayScore: null,
                                    },
                                aResult,
                                aFinished,
                                exactPoints,
                                correctResultPoints,
                              );

                              const bEvaluation = evaluatePrediction(
                                bPrediction
                                  ? {
                                      predictedHomeScore:
                                        bPrediction.predictedHomeScore,
                                      predictedAwayScore:
                                        bPrediction.predictedAwayScore,
                                    }
                                  : {
                                      predictedHomeScore: null,
                                      predictedAwayScore: null,
                                    },
                                bResult,
                                bFinished,
                                exactPoints,
                                correctResultPoints,
                              );

                              // Define sort order: exact -> correct-result -> miss -> no-prediction
                              const typeOrder = {
                                exact: 0,
                                "correct-result": 1,
                                miss: 2,
                                "no-prediction": 3,
                              };

                              return (
                                typeOrder[aEvaluation.type] -
                                typeOrder[bEvaluation.type]
                              );
                            },
                          );

                          return sortedFixtures;
                        })().map((fixture) => {
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
                              className={`overflow-hidden rounded-xl border ${
                                evaluation.type === "exact"
                                  ? "border-green-500/30 bg-gradient-to-b from-green-500/20 to-green-500/10"
                                  : evaluation.type === "correct-result"
                                    ? "border-green-400/30 bg-gradient-to-b from-green-300/20 to-green-300/10"
                                    : evaluation.type === "miss"
                                      ? "border-red-400/30 bg-gradient-to-b from-red-300/20 to-red-300/10"
                                      : "border-border/50 bg-muted/30"
                              }`}
                            >
                              {/* Teams Row */}
                              <div className="flex items-center justify-center gap-3 px-3 py-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                                  <Image
                                    src={fixture.teams.home.logo}
                                    alt={fixture.teams.home.name}
                                    width={28}
                                    height={28}
                                    className="h-7 w-7 object-contain"
                                  />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  vs
                                </span>
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                                  <Image
                                    src={fixture.teams.away.logo}
                                    alt={fixture.teams.away.name}
                                    width={28}
                                    height={28}
                                    className="h-7 w-7 object-contain"
                                  />
                                </div>
                              </div>

                              {/* Prediction Info */}
                              <div
                                className={`px-3 py-2 text-center ${
                                  evaluation.type === "exact"
                                    ? "bg-green-500/10"
                                    : evaluation.type === "correct-result"
                                      ? "bg-green-300/10"
                                      : evaluation.type === "miss"
                                        ? "bg-red-300/10"
                                        : "bg-muted/30"
                                }`}
                              >
                                <p className="mb-1 text-[10px] text-muted-foreground">
                                  {user.id === userId ? "Tu" : "Su"} pronóstico:
                                </p>
                                <p
                                  className={`text-base font-bold tabular-nums ${
                                    evaluation.type === "exact"
                                      ? "text-green-600"
                                      : evaluation.type === "correct-result"
                                        ? "text-green-700"
                                        : evaluation.type === "miss"
                                          ? "text-red-600"
                                          : "text-muted-foreground"
                                  }`}
                                >
                                  {(() => {
                                    const matchNotStarted =
                                      fixture.fixture.status.short === "NS";
                                    const isOtherUser = user.id !== userId;

                                    // Hide other users' predictions if match hasn't started
                                    if (matchNotStarted && isOtherUser) {
                                      return (
                                        <span className="text-xs font-normal italic text-muted-foreground">
                                          Oculto
                                        </span>
                                      );
                                    }

                                    // Show prediction normally
                                    if (
                                      prediction &&
                                      prediction.predictedHomeScore !== null &&
                                      prediction.predictedAwayScore !== null
                                    ) {
                                      return `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`;
                                    }

                                    return "−";
                                  })()}
                                </p>
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

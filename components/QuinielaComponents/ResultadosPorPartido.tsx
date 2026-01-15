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
  Calendar,
  Loader2,
  AlertCircle,
  Play,
} from "lucide-react";
import Image from "next/image";
import { Quiniela } from "@/db/schema";
import { FixtureData } from "@/types/fixtures";
import { AllPredictionsData } from "@/hooks/predictions/useAllPredictions";
import { getDefaultActiveRound } from "./RegistrarPronosticos";

interface ResultadosPorPartidoProps {
  quiniela: Quiniela;
  userId: string;
  exactPoints?: number;
  correctResultPoints?: number;
}

interface FixtureStats {
  exact: number;
  correctResult: number;
  miss: number;
  noPrediction: number;
  totalPredictions: number;
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
  type: "exact" | "correct-result" | "miss" | "no-prediction" | "pending";
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

  // Match not finished yet - show as pending
  if (
    !matchFinished ||
    actualResult.homeScore === null ||
    actualResult.awayScore === null
  ) {
    return {
      type: "pending",
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

// Helper to group predictions by fixture
function groupPredictionsByFixture(
  predictions: AllPredictionsData[],
): Map<string, AllPredictionsData[]> {
  const grouped = new Map<string, AllPredictionsData[]>();

  predictions.forEach((prediction) => {
    const fixtureId = prediction.externalFixtureId;
    if (!grouped.has(fixtureId)) {
      grouped.set(fixtureId, []);
    }
    grouped.get(fixtureId)!.push(prediction);
  });

  return grouped;
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper function to check if match is live
function isMatchLive(fixture: FixtureData): boolean {
  const statusShort = fixture.fixture.status.short;
  // Match is in progress (1H, HT, 2H, ET, BT, P, SUSP, INT, LIVE, etc.)
  const liveStatuses = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"];
  return liveStatuses.includes(statusShort);
}

export default function ResultadosPorPartido({
  quiniela,
  userId,
  exactPoints = 2,
  correctResultPoints = 1,
}: ResultadosPorPartidoProps) {
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

  // Filter predictions by selected round and group by fixture
  const fixturePredictions = useMemo(() => {
    const filtered = allPredictions.filter(
      (p) => p.externalRound === selectedRound,
    );
    return groupPredictionsByFixture(filtered);
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

  // Calculate fixture stats (how many exact, correct, miss, no prediction)
  const fixtureStats = useMemo(() => {
    const stats = new Map<string, FixtureStats>();

    roundFixtures.forEach((fixture) => {
      const fixtureId = fixture.fixture.id.toString();
      const predictions = fixturePredictions.get(fixtureId) || [];
      const actualResult = {
        homeScore: fixture.goals.home,
        awayScore: fixture.goals.away,
      };
      const matchFinished =
        fixture.fixture.status.short === "FT" ||
        fixture.fixture.status.short === "AET" ||
        fixture.fixture.status.short === "PEN";

      let exact = 0;
      let correctResult = 0;
      let miss = 0;
      let noPrediction = 0;

      // Count predictions from all users
      usersWithPredictions.forEach((user) => {
        const userPrediction = predictions.find((p) => p.userId === user.id);
        const evaluation = evaluatePrediction(
          userPrediction
            ? {
                predictedHomeScore: userPrediction.predictedHomeScore,
                predictedAwayScore: userPrediction.predictedAwayScore,
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
          case "pending":
            noPrediction++;
            break;
        }
      });

      stats.set(fixtureId, {
        exact,
        correctResult,
        miss,
        noPrediction,
        totalPredictions: predictions.length,
      });
    });

    return stats;
  }, [
    roundFixtures,
    fixturePredictions,
    usersWithPredictions,
    exactPoints,
    correctResultPoints,
  ]);

  // Sort fixtures: finished first, then by date
  const sortedFixtures = useMemo(() => {
    return [...roundFixtures].sort((a, b) => {
      const aFinished =
        a.fixture.status.short === "FT" ||
        a.fixture.status.short === "AET" ||
        a.fixture.status.short === "PEN";
      const bFinished =
        b.fixture.status.short === "FT" ||
        b.fixture.status.short === "AET" ||
        b.fixture.status.short === "PEN";

      // Finished matches first
      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;

      // Then sort by date
      return (
        new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
      );
    });
  }, [roundFixtures]);

  // State to manage which cards are open
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  if (fixturesLoading || predictionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          Cargando resultados...
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
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Resultados Por Partido</h2>
              {roundFixtures.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {roundFixtures.length} partidos •{" "}
                  {usersWithPredictions.length} participantes
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

      {/* Fixture Cards */}
      {roundFixtures.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No hay partidos disponibles para esta jornada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedFixtures.map((fixture) => {
            const fixtureId = fixture.fixture.id.toString();
            const predictions = fixturePredictions.get(fixtureId) || [];
            const stats = fixtureStats.get(fixtureId);
            const isOpen = openCards[fixtureId] || false;
            const matchFinished =
              fixture.fixture.status.short === "FT" ||
              fixture.fixture.status.short === "AET" ||
              fixture.fixture.status.short === "PEN";
            const matchNotStarted = fixture.fixture.status.short === "NS";

            if (!stats) return null;

            return (
              <Collapsible
                key={fixtureId}
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenCards((prev) => ({ ...prev, [fixtureId]: open }))
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
                      <CardHeader className="relative w-full p-4">
                        {/* Mobile Chevron - Absolute positioned */}
                        <div
                          className={`absolute right-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors sm:hidden ${matchFinished ? "top-1/4" : "top-1/2"} ${isOpen ? "bg-primary/10" : "bg-muted/50"}`}
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          {/* Match Info */}
                          <div className="flex min-w-0 flex-1 items-center justify-center gap-3 sm:justify-start">
                            {/* Home Team Logo */}
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                              <Image
                                src={fixture.teams.home.logo}
                                alt={fixture.teams.home.name}
                                width={40}
                                height={40}
                                className="h-9 w-9 object-contain"
                              />
                            </div>

                            {/* Score / VS */}
                            {matchFinished ? (
                              <span className="rounded-md bg-gradient-to-br from-primary/20 to-primary/10 px-3 py-1.5 text-lg font-bold tabular-nums text-primary ring-1 ring-primary/20">
                                {fixture.goals.home} - {fixture.goals.away}
                              </span>
                            ) : isMatchLive(fixture) ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <Play className="h-3 w-3 animate-pulse text-red-600" />
                                  <span className="text-[10px] font-medium text-red-600">EN VIVO</span>
                                </div>
                                <span className="rounded-md bg-gradient-to-br from-primary/20 to-primary/10 px-3 py-1.5 text-lg font-bold tabular-nums text-primary ring-1 ring-primary/20">
                                  {fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="rounded-md bg-muted/50 px-3 py-1 text-sm font-medium text-muted-foreground">
                                  vs
                                </span>
                                <span className="mt-1 text-[10px] text-muted-foreground">
                                  {formatDate(fixture.fixture.date)}
                                </span>
                              </div>
                            )}

                            {/* Away Team Logo */}
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                              <Image
                                src={fixture.teams.away.logo}
                                alt={fixture.teams.away.name}
                                width={40}
                                height={40}
                                className="h-9 w-9 object-contain"
                              />
                            </div>
                          </div>

                          {/* Stats Summary - Desktop */}
                          {matchFinished && (
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
                          )}

                          {/* Participants count and chevron - Desktop only */}
                          <div className="hidden items-center gap-2 sm:flex">
                            <span className="text-xs text-muted-foreground">
                              {usersWithPredictions.length}
                            </span>
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${isOpen ? "bg-primary/10" : "bg-muted/50"}`}
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Stats Summary */}
                        {matchFinished && (
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
                        )}
                      </CardHeader>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="border-t border-border/50 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {(() => {
                          // Sort users by prediction evaluation type (exact first, then correct, then miss, then no prediction)
                          const sortedUsers = [...usersWithPredictions].sort(
                            (a, b) => {
                              const aPrediction = predictions.find(
                                (p) => p.userId === a.id,
                              );
                              const bPrediction = predictions.find(
                                (p) => p.userId === b.id,
                              );

                              const actualResult = {
                                homeScore: fixture.goals.home,
                                awayScore: fixture.goals.away,
                              };

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
                                actualResult,
                                matchFinished,
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
                                actualResult,
                                matchFinished,
                                exactPoints,
                                correctResultPoints,
                              );

                              // Define sort order: exact -> correct-result -> miss -> pending -> no-prediction
                              const typeOrder = {
                                exact: 0,
                                "correct-result": 1,
                                miss: 2,
                                pending: 3,
                                "no-prediction": 4,
                              };

                              return (
                                typeOrder[aEvaluation.type] -
                                typeOrder[bEvaluation.type]
                              );
                            },
                          );

                          return sortedUsers;
                        })().map((user) => {
                          const prediction = predictions.find(
                            (p) => p.userId === user.id,
                          );
                          const actualResult = {
                            homeScore: fixture.goals.home,
                            awayScore: fixture.goals.away,
                          };

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

                          // Hide other users' predictions if match hasn't started
                          const isOtherUser = user.id !== userId;
                          const shouldHidePrediction =
                            matchNotStarted && isOtherUser;

                          return (
                            <div
                              key={user.id}
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
                              {/* User Row */}
                              <div className="flex items-center justify-center gap-2 px-3 py-3">
                                <Avatar className="h-7 w-7 flex-shrink-0">
                                  <AvatarImage
                                    src={user.image || undefined}
                                    alt={user.name || user.email || "User"}
                                  />
                                  <AvatarFallback className="bg-primary/10 text-xs font-medium">
                                    {(user.name ||
                                      user.email ||
                                      "?")[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-xs font-medium">
                                  {user.name || user.email}
                                  {user.id === userId && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                      (tú)
                                    </span>
                                  )}
                                </span>
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
                                  Pronóstico:
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
                                    // Hide other users' predictions if match hasn't started
                                    if (shouldHidePrediction) {
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

"use client";

import { useMemo } from "react";
import { useFixtures } from "@/hooks/api-football/useFixtures";
import { useAllPredictions } from "@/hooks/predictions/useAllPredictions";
import { getFixturesParamsFromQuiniela } from "@/utils/quinielaHelpers";
import { Card, CardContent } from "@/components/ui/card";

import { Trophy, Users, Crown, Medal, Award, DollarSign } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Quiniela } from "@/db/schema";
import { FixtureData, isMatchFinished, isMatchLive } from "@/types/fixtures";
import { AllPredictionsData } from "@/hooks/predictions/useAllPredictions";

interface PrizeDistribution {
  position: number;
  percentage: number;
}

interface QuinielaLeaderboardProps {
  quiniela: Quiniela;
  exactPoints?: number;
  correctResultPoints?: number;
  moneyToEnter?: number;
  prizeDistribution?: PrizeDistribution[];
  participantCount?: number;
}

interface UserStats {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  totalPoints: number;
  pp: number; // partidos pronosticados
  rea: number; // resultado exacto acertado
  ra: number; // resultado acertado
  ri: number; // resultado incorrecto
  position: number;
}

// Helper function to evaluate prediction accuracy
function evaluatePrediction(
  prediction: {
    predictedHomeScore: number | null;
    predictedAwayScore: number | null;
  },
  actualResult: { homeScore: number | null; awayScore: number | null },
  canEvaluate: boolean, // true if match is finished or live
  exactPoints: number = 2,
  correctResultPoints: number = 1,
): {
  type: "exact" | "correct-result" | "miss" | "no-prediction";
  points: number;
} {
  // No prediction case
  if (
    prediction.predictedHomeScore === null ||
    prediction.predictedAwayScore === null
  ) {
    return {
      type: "no-prediction",
      points: 0,
    };
  }

  // Match not started yet or no scores available
  if (
    !canEvaluate ||
    actualResult.homeScore === null ||
    actualResult.awayScore === null
  ) {
    return {
      type: "no-prediction",
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
      points: correctResultPoints,
    };
  }

  // Miss
  return {
    type: "miss",
    points: 0,
  };
}

export default function QuinielaLeaderboard({
  quiniela,
  exactPoints = 2,
  correctResultPoints = 1,
  moneyToEnter,
  prizeDistribution,
  participantCount = 0,
}: QuinielaLeaderboardProps) {
  // Calculate total prize pool and prizes per position
  const totalPrizePool = moneyToEnter ? moneyToEnter * participantCount : 0;
  
  const getPrizeForPosition = (position: number): number | null => {
    if (!moneyToEnter || !prizeDistribution || totalPrizePool === 0) return null;
    const prize = prizeDistribution.find((p) => p.position === position);
    if (!prize) return null;
    return (totalPrizePool * prize.percentage) / 100;
  };
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

  // Calculate user statistics across all rounds
  const userStats = useMemo(() => {
    if (!fixturesData?.response || !allPredictions.length) return [];

    const userStatsMap = new Map<string, UserStats>();

    // Group predictions by user
    const predictionsByUser = new Map<string, AllPredictionsData[]>();
    allPredictions.forEach((prediction) => {
      if (!predictionsByUser.has(prediction.userId)) {
        predictionsByUser.set(prediction.userId, []);
      }
      predictionsByUser.get(prediction.userId)!.push(prediction);
    });

    // Calculate stats for each user
    predictionsByUser.forEach((userPredictions, userId) => {
      const user = userPredictions[0]; // Get user info from first prediction
      let totalPoints = 0;
      let exact = 0;
      let correctResult = 0;
      let miss = 0;

      // Check each finished fixture
      fixturesData.response.forEach((fixture: FixtureData) => {
        const matchFinished =
          isMatchFinished(fixture.fixture.status.short);

        const matchLive = isMatchLive(fixture.fixture.status.short);

        if (!matchFinished && !matchLive) return;

        const prediction = userPredictions.find(
          (p) => p.externalFixtureId === fixture.fixture.id.toString(),
        );

        const actualResult = {
          homeScore: fixture.goals.home,
          awayScore: fixture.goals.away,
        };

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
          matchFinished || matchLive,
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
        }
      });

      const pp = exact + correctResult + miss; // partidos pronosticados

      userStatsMap.set(userId, {
        id: userId,
        name: user.userName || user.userEmail || "Usuario",
        email: user.userEmail,
        image: user.userImage,
        totalPoints,
        pp,
        rea: exact,
        ra: correctResult,
        ri: miss,
        position: 0, // Will be set after sorting
      });
    });

    // Sort by total points and assign positions
    const sortedUsers = Array.from(userStatsMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((user, index) => ({
        ...user,
        position: index + 1,
      }));

    return sortedUsers;
  }, [
    fixturesData?.response,
    allPredictions,
    exactPoints,
    correctResultPoints,
  ]);

  // Get position icon
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-4 w-4" />;
      case 2:
        return <Medal className="h-4 w-4" />;
      case 3:
        return <Award className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Get position styles
  const getPositionStyles = (position: number) => {
    switch (position) {
      case 1:
        return {
          badge:
            "bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900 shadow-lg shadow-yellow-500/25",
          ring: "ring-yellow-400/50",
          glow: "shadow-yellow-500/20",
        };
      case 2:
        return {
          badge:
            "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800 shadow-lg shadow-slate-400/25",
          ring: "ring-slate-300/50",
          glow: "shadow-slate-400/20",
        };
      case 3:
        return {
          badge:
            "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100 shadow-lg shadow-amber-600/25",
          ring: "ring-amber-500/50",
          glow: "shadow-amber-500/20",
        };
      default:
        return {
          badge: "bg-muted text-muted-foreground",
          ring: "ring-border/50",
          glow: "",
        };
    }
  };

  if (fixturesLoading || predictionsLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Tabla de Posiciones</h3>
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fixturesError || predictionsError || !userStats.length) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Tabla de Posiciones</h3>
              <p className="text-sm text-muted-foreground">Sin datos</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {!userStats.length
                ? "No hay datos suficientes para mostrar la tabla"
                : "Error al cargar los datos"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/50">
      <CardContent className="p-0">
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">Tabla de Posiciones</h3>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {userStats.length} participantes • Torneo completo
                </p>
              </div>
            </div>
            {totalPrizePool > 0 && (
              <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                <div className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 sm:gap-2 sm:px-3 sm:py-1.5">
                  <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400 sm:h-4 sm:w-4" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 sm:text-sm">
                    ${totalPrizePool.toLocaleString("es-MX")}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">Premio del torneo</span>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="divide-y divide-border/50">
          {userStats.map((user, index) => {
            const styles = getPositionStyles(index + 1);
            const isTopThree = index < 3;

            return (
              <div
                key={user.id}
                className={`group relative p-4 transition-colors hover:bg-muted/30 sm:p-5 ${
                  isTopThree ? "bg-muted/10" : ""
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Position Badge */}
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold sm:h-9 sm:w-9 sm:text-sm ${styles.badge}`}
                  >
                    {getPositionIcon(index + 1) || `#${index + 1}`}
                  </div>

                  {/* Avatar */}
                  <Avatar
                    className={`h-10 w-10 ring-2 ring-offset-2 ring-offset-background sm:h-12 sm:w-12 ${styles.ring}`}
                  >
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="bg-muted text-sm font-medium">
                      {user.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user.name}</p>
                    {/* Stats Pills - Mobile: 2 cols, Desktop: inline */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                        {user.pp} jugados
                      </span>
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        {user.rea} exactos
                      </span>
                      <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                        {user.ra} acertados
                      </span>
                      {user.ri > 0 && (
                        <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                          {user.ri} fallados
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points & Prize */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-xl font-bold tabular-nums sm:text-2xl ${
                          isTopThree ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {user.totalPoints}
                      </span>
                      <span className="text-[10px] text-muted-foreground sm:text-xs">
                        puntos
                      </span>
                    </div>
                    {/* Prize Money */}
                    {(() => {
                      const prize = getPrizeForPosition(index + 1);
                      if (prize === null) return null;
                      return (
                        <div className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                          <DollarSign className="h-3 w-3" />
                          <span className="text-xs font-medium tabular-nums">
                            {prize.toLocaleString("es-MX", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

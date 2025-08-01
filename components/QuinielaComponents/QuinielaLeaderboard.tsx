"use client";

import { useMemo } from "react";
import { useFixtures } from "@/hooks/api-football/useFixtures";
import { useAllPredictions } from "@/hooks/predictions/useAllPredictions";
import { getFixturesParamsFromQuiniela } from "@/utils/quinielaHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Trophy, Target, CheckCircle, XCircle, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Quiniela } from "@/db/schema";
import { FixtureData } from "@/types/fixtures";
import { AllPredictionsData } from "@/hooks/predictions/useAllPredictions";

interface QuinielaLeaderboardProps {
  quiniela: Quiniela;
  exactPoints?: number;
  correctResultPoints?: number;
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
  matchFinished: boolean,
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

  // Match not finished yet
  if (
    !matchFinished ||
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
}: QuinielaLeaderboardProps) {
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
          fixture.fixture.status.short === "FT" ||
          fixture.fixture.status.short === "AET" ||
          fixture.fixture.status.short === "PEN";

        if (!matchFinished) return;

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

  if (fixturesLoading || predictionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tabla de Posiciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              Cargando estadísticas...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fixturesError || predictionsError || !userStats.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tabla de Posiciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              {!userStats.length
                ? "No hay datos suficientes para mostrar la tabla de posiciones"
                : "Error al cargar los datos"}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = userStats.map((user) => ({
    name: user.name.split(" ")[0] || user.name, // Use first name for chart
    fullName: user.name,
    totalPoints: user.totalPoints,
    pp: user.pp,
    rea: user.rea,
    ra: user.ra,
    ri: user.ri,
    position: user.position,
    avatar: user.image,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Tabla de Posiciones
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {userStats.length} participantes
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="space-y-4">
          {chartData.map((user, index) => {
            const maxPoints = Math.max(...chartData.map((u) => u.totalPoints));
            const percentage =
              maxPoints > 0 ? (user.totalPoints / maxPoints) * 100 : 0;

            return (
              <div key={user.name} className="group">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={index < 3 ? "default" : "secondary"}
                      className={`px-2 py-1 font-bold ${
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
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="text-sm">
                        {user.fullName[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        PP: {user.pp} • REA: {user.rea} • RA: {user.ra} • RI:{" "}
                        {user.ri}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {user.totalPoints}
                    </div>
                    <div className="text-xs text-muted-foreground">puntos</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      index === 0
                        ? "bg-yellow-500"
                        : index === 1
                          ? "bg-gray-400"
                          : index === 2
                            ? "bg-amber-600"
                            : "bg-primary"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                  {/* Shine effect */}
                  <div
                    className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="text-xs">PP - Partidos Pronosticados</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs">REA - Resultado Exacto</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-xs">RA - Resultado Acertado</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-xs">RI - Resultado Incorrecto</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

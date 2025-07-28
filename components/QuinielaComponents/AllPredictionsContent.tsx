"use client";

import { useState, useMemo, useEffect } from "react";
import { useFixtures } from "@/hooks/api-football/useFixtures";
import { useAllPredictions } from "@/hooks/predictions/useAllPredictions";
import { getFixturesParamsFromQuiniela } from "@/utils/quinielaHelpers";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  Clock,
  CheckCircle2,
  Play,
  Check,
  X,
  Minus,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { Quiniela } from "@/db/schema";
import { FixtureData } from "@/types/fixtures";
import { AllPredictionsData } from "@/hooks/predictions/useAllPredictions";

interface AllPredictionsContentProps {
  quiniela: Quiniela;
  userId: string;
}

// Helper function to determine the default active round
function getDefaultActiveRound(
  rounds: { roundName: string; dates: string[] }[],
): string {
  if (!rounds.length) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if today falls within any round
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

  // If today doesn't fall in any round, find the closest one
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

// Helper function to format match status
function getMatchStatus(fixture: FixtureData): string {
  if (fixture.fixture.status.short === "NS") {
    return "vs";
  }

  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;
  return `${homeGoals} - ${awayGoals}`;
}

// Helper function to get match status info
function getMatchStatusInfo(fixture: FixtureData): {
  icon: React.ReactNode;
  status: "not-started" | "in-progress" | "finished";
  statusText: string;
} {
  const statusShort = fixture.fixture.status.short;

  if (statusShort === "NS") {
    return {
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      status: "not-started",
      statusText: "Por comenzar",
    };
  }

  if (statusShort === "FT" || statusShort === "AET" || statusShort === "PEN") {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
      status: "finished",
      statusText: "Finalizado",
    };
  }

  return {
    icon: (
      <div className="flex items-center">
        <Play className="h-4 w-4 animate-pulse text-red-600" />
        <span className="ml-1 text-xs font-medium text-red-600">EN VIVO</span>
      </div>
    ),
    status: "in-progress",
    statusText: "En progreso",
  };
}

// Helper function to format date and time
function formatDateTime(dateString: string): { date: string; time: string } {
  const date = new Date(dateString);
  const formattedDate = date
    .toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "/");

  const formattedTime = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return { date: formattedDate, time: formattedTime };
}

// Helper function to evaluate prediction accuracy
function evaluatePrediction(
  prediction: {
    predictedHomeScore: number | null;
    predictedAwayScore: number | null;
  },
  actualResult: { homeScore: number | null; awayScore: number | null },
  matchFinished: boolean,
): {
  type: "exact" | "correct-result" | "miss" | "no-prediction" | "pending";
  icon: React.ReactNode;
  color: string;
  text: string;
} {
  // No prediction case
  if (
    prediction.predictedHomeScore === null ||
    prediction.predictedAwayScore === null
  ) {
    return {
      type: "no-prediction",
      icon: <Minus className="h-3 w-3" />,
      color: "text-muted-foreground",
      text: "Sin pronóstico",
    };
  }

  // Match not finished yet
  if (
    !matchFinished ||
    actualResult.homeScore === null ||
    actualResult.awayScore === null
  ) {
    return {
      type: "pending",
      icon: <Clock className="h-3 w-3" />,
      color: "text-blue-600",
      text: "Pendiente",
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
      icon: <Trophy className="h-3 w-3" />,
      color: "text-green-600",
      text: "Exacto",
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
      icon: <Check className="h-3 w-3" />,
      color: "text-blue-600",
      text: "Resultado",
    };
  }

  // Miss
  return {
    type: "miss",
    icon: <X className="h-3 w-3" />,
    color: "text-red-600",
    text: "Error",
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

export default function AllPredictionsContent({
  quiniela,
  userId,
}: AllPredictionsContentProps) {
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

  // Get unique users who have predictions in this round
  const usersWithPredictions = useMemo(() => {
    const users = new Map<
      string,
      { id: string; name: string | null; email: string | null }
    >();

    allPredictions.forEach((prediction) => {
      if (!users.has(prediction.userId)) {
        users.set(prediction.userId, {
          id: prediction.userId,
          name: prediction.userName,
          email: prediction.userEmail,
        });
      }
    });

    return Array.from(users.values()).sort((a, b) =>
      (a.name || a.email || "").localeCompare(b.name || b.email || ""),
    );
  }, [allPredictions]);

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
    <div className="space-y-6 pb-24">
      {/* Round Selector Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Pronósticos de todos los participantes
          </h2>
          {roundFixtures.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Se encontraron {roundFixtures.length} partidos •{" "}
              {usersWithPredictions.length} participantes
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

      {/* Fixtures List */}
      <div className="space-y-4">
        {roundFixtures.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No hay partidos disponibles para esta jornada
              </p>
            </CardContent>
          </Card>
        ) : (
          roundFixtures.map((fixture) => {
            const { date, time } = formatDateTime(fixture.fixture.date);
            const matchStatus = getMatchStatus(fixture);
            const statusInfo = getMatchStatusInfo(fixture);
            const matchFinished = statusInfo.status === "finished";

            const actualResult = {
              homeScore: fixture.goals.home,
              awayScore: fixture.goals.away,
            };

            // Get predictions for this fixture
            const fixturePredictions = usersWithPredictions.map((user) => {
              const userPredictions = roundPredictions.get(user.id) || [];
              const prediction = userPredictions.find(
                (p) => p.externalFixtureId === fixture.fixture.id.toString(),
              );

              return {
                user,
                prediction: prediction
                  ? {
                      predictedHomeScore: prediction.predictedHomeScore,
                      predictedAwayScore: prediction.predictedAwayScore,
                    }
                  : {
                      predictedHomeScore: null,
                      predictedAwayScore: null,
                    },
                evaluation: evaluatePrediction(
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
                ),
              };
            });

            return (
              <Card key={fixture.fixture.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Match Header */}
                  <div className="border-b bg-muted/30 px-4 py-3">
                    <div className="grid grid-cols-[1fr_1px_1fr] gap-3 text-sm sm:gap-4">
                      {/* Left Side - Date & Status */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          <span className="text-sm">
                            {date} {time}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusInfo.icon}
                          <span className="text-xs text-muted-foreground sm:text-sm">
                            {statusInfo.statusText}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="bg-border"></div>

                      {/* Right Side - Venue */}
                      <div className="flex flex-col gap-1.5 justify-self-end text-right sm:gap-2">
                        {fixture.fixture.venue && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span className="break-words text-right text-sm">
                              {fixture.fixture.venue.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match Teams and Score */}
                  <div className="border-b p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      {/* Home Team */}
                      <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:justify-start">
                        <Image
                          src={fixture.teams.home.logo}
                          alt={fixture.teams.home.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 object-contain"
                        />
                        <div className="text-center sm:text-left">
                          <h3 className="text-sm font-medium sm:text-base">
                            {fixture.teams.home.name}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            Local
                          </Badge>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="mx-4 flex-shrink-0 text-center">
                        <div className="min-w-20 rounded-lg bg-muted/50 px-4 py-2 text-xl font-bold sm:text-2xl">
                          {matchStatus}
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:justify-end">
                        <div className="text-center sm:text-right">
                          <h3 className="text-sm font-medium sm:text-base">
                            {fixture.teams.away.name}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            Visitante
                          </Badge>
                        </div>
                        <Image
                          src={fixture.teams.away.logo}
                          alt={fixture.teams.away.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Predictions */}
                  <div className="p-4 sm:p-6">
                    <h4 className="mb-4 font-medium">
                      Pronósticos de los participantes
                    </h4>

                    {fixturePredictions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay pronósticos para este partido
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {fixturePredictions.map(
                          ({ user, prediction, evaluation }) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              {/* User Info */}
                              <div className="flex flex-1 items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                                  {(user.name ||
                                    user.email ||
                                    "?")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {user.name || user.email}
                                  </p>
                                  {user.id === userId && (
                                    <p className="text-xs text-blue-600">Tú</p>
                                  )}
                                </div>
                              </div>

                              {/* Prediction */}
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 font-mono text-sm">
                                  {prediction.predictedHomeScore !== null &&
                                  prediction.predictedAwayScore !== null ? (
                                    <>
                                      <span>
                                        {prediction.predictedHomeScore}
                                      </span>
                                      <span className="text-muted-foreground">
                                        -
                                      </span>
                                      <span>
                                        {prediction.predictedAwayScore}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </div>

                                {/* Evaluation */}
                                <div
                                  className={`flex items-center gap-1 ${evaluation.color}`}
                                >
                                  {evaluation.icon}
                                  <span className="text-xs">
                                    {evaluation.text}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

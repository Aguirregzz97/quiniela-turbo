"use client";

import { useState, useMemo, useEffect } from "react";
import { useFixtures } from "@/hooks/api-football/useFixtures";
import { getFixturesParamsFromQuiniela } from "@/utils/quinielaHelpers";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Play,
  Upload,
  BarChart3,
  Loader2,
  Ban,
} from "lucide-react";
import Image from "next/image";
import { Quiniela } from "@/db/schema";
import { FixtureData } from "@/types/fixtures";
import { usePredictions } from "@/hooks/predictions/usePredictions";
import { useMultipleOdds } from "@/hooks/api-football/useOdds";
import { OddsApiResponse, Bet, Value } from "@/types/odds";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  savePredictions,
  PredictionInput,
} from "@/app/quinielas/predictions-action";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface RegistrarPronosticosProps {
  quiniela: Quiniela;
  userId: string;
}

// Helper function to determine the default active round
export function getDefaultActiveRound(
  rounds: { roundName: string; dates: string[] }[],
): string {
  if (!rounds.length) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if today falls within any round
  for (const round of rounds) {
    if (round.dates.length === 0) continue;

    const roundEnd = new Date(round.dates[round.dates.length - 1]);
    roundEnd.setHours(23, 59, 59, 999);

    if (roundEnd >= today) {
      return round.roundName;
    }
  }

  return rounds[0].roundName;
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

  // Match is in progress (1H, HT, 2H, ET, BT, P, SUSP, INT, LIVE, etc.)
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

// Bet ID constants
const MATCH_WINNER_BET_ID = 1;
const BOTH_TEAMS_SCORE_BET_ID = 8;
const CLEAN_SHEET_HOME_BET_ID = 27;
const CLEAN_SHEET_AWAY_BET_ID = 28;

// Types for extracted odds
interface MatchWinnerOdds {
  home: string;
  draw: string;
  away: string;
}

interface BothTeamsScoreOdds {
  yes: string;
  no: string;
}

interface CleanSheetOdds {
  home: string;
  away: string;
}

interface AllOdds {
  matchWinner: MatchWinnerOdds | null;
  bothTeamsScore: BothTeamsScoreOdds | null;
  cleanSheet: CleanSheetOdds | null;
}

// Helper function to extract all odds from API response
function getAllOdds(oddsData: OddsApiResponse | undefined): AllOdds {
  const result: AllOdds = {
    matchWinner: null,
    bothTeamsScore: null,
    cleanSheet: null,
  };

  if (!oddsData?.response?.length) return result;

  const bookmaker = oddsData.response[0]?.bookmakers[0];
  if (!bookmaker?.bets) return result;

  // Match Winner (id: 1)
  const matchWinnerBet = bookmaker.bets.find(
    (bet: Bet) => bet.id === MATCH_WINNER_BET_ID,
  );
  if (matchWinnerBet) {
    const homeOdd = matchWinnerBet.values.find(
      (v: Value) => v.value === "Home",
    )?.odd;
    const drawOdd = matchWinnerBet.values.find(
      (v: Value) => v.value === "Draw",
    )?.odd;
    const awayOdd = matchWinnerBet.values.find(
      (v: Value) => v.value === "Away",
    )?.odd;

    if (homeOdd && drawOdd && awayOdd) {
      result.matchWinner = { home: homeOdd, draw: drawOdd, away: awayOdd };
    }
  }

  // Both Teams Score (id: 8)
  const bothTeamsScoreBet = bookmaker.bets.find(
    (bet: Bet) => bet.id === BOTH_TEAMS_SCORE_BET_ID,
  );
  if (bothTeamsScoreBet) {
    const yesOdd = bothTeamsScoreBet.values.find(
      (v: Value) => v.value === "Yes",
    )?.odd;
    const noOdd = bothTeamsScoreBet.values.find(
      (v: Value) => v.value === "No",
    )?.odd;

    if (yesOdd && noOdd) {
      result.bothTeamsScore = { yes: yesOdd, no: noOdd };
    }
  }

  // Clean Sheet - Home (id: 27) and Away (id: 28)
  const cleanSheetHomeBet = bookmaker.bets.find(
    (bet: Bet) => bet.id === CLEAN_SHEET_HOME_BET_ID,
  );
  const cleanSheetAwayBet = bookmaker.bets.find(
    (bet: Bet) => bet.id === CLEAN_SHEET_AWAY_BET_ID,
  );

  const cleanSheetHomeOdd = cleanSheetHomeBet?.values.find(
    (v: Value) => v.value === "Yes",
  )?.odd;
  const cleanSheetAwayOdd = cleanSheetAwayBet?.values.find(
    (v: Value) => v.value === "Yes",
  )?.odd;

  if (cleanSheetHomeOdd && cleanSheetAwayOdd) {
    result.cleanSheet = { home: cleanSheetHomeOdd, away: cleanSheetAwayOdd };
  }

  return result;
}

export default function RegistrarPronosticos({
  quiniela,
  userId,
}: RegistrarPronosticosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fixturesParams = getFixturesParamsFromQuiniela(quiniela);

  const {
    data: fixturesData,
    isLoading,
    error,
  } = useFixtures(
    fixturesParams.leagueId,
    fixturesParams.season,
    fixturesParams.fromDate,
    fixturesParams.toDate,
  );

  const { data: existingPredictions = [] } = usePredictions(quiniela.id);

  // Get available rounds from quiniela data
  const availableRounds = quiniela.roundsSelected || [];

  // Determine default active round
  const defaultRound = getDefaultActiveRound(availableRounds);
  const [selectedRound, setSelectedRound] = useState<string>(defaultRound);

  // State to manage all predictions for the current round
  const [predictions, setPredictions] = useState<
    Record<string, { home: string; away: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter fixtures by selected round
  const roundFixtures = useMemo(() => {
    return filterFixturesByRound(fixturesData?.response, selectedRound);
  }, [fixturesData?.response, selectedRound]);

  // Get fixture IDs for odds fetching
  const fixtureIds = useMemo(() => {
    return roundFixtures.map((fixture) => fixture.fixture.id);
  }, [roundFixtures]);

  // Fetch odds for all fixtures in the round
  const { data: oddsData, isLoading: isLoadingOdds } =
    useMultipleOdds(fixtureIds);

  // Initialize predictions with existing data when round changes
  useEffect(() => {
    if (roundFixtures.length > 0) {
      const initialPredictions: Record<string, { home: string; away: string }> =
        {};

      roundFixtures.forEach((fixture) => {
        const fixtureId = fixture.fixture.id.toString();
        const existingPrediction = existingPredictions.find(
          (p) =>
            p.externalFixtureId === fixtureId &&
            p.externalRound === selectedRound,
        );

        initialPredictions[fixtureId] = {
          home: existingPrediction?.predictedHomeScore?.toString() || "0",
          away: existingPrediction?.predictedAwayScore?.toString() || "0",
        };
      });

      // Only update if the predictions actually changed
      setPredictions((prev) => {
        const hasChanged =
          Object.keys(initialPredictions).some(
            (fixtureId) =>
              prev[fixtureId]?.home !== initialPredictions[fixtureId]?.home ||
              prev[fixtureId]?.away !== initialPredictions[fixtureId]?.away,
          ) ||
          Object.keys(prev).length !== Object.keys(initialPredictions).length;

        return hasChanged ? initialPredictions : prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRound, roundFixtures.length, existingPredictions.length]);

  // Handle prediction updates
  const updatePrediction = (
    fixtureId: string,
    team: "home" | "away",
    score: string,
  ) => {
    setPredictions((prev) => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [team]: score,
      },
    }));
  };

  // Check if fixture has existing prediction
  const hasExistingPrediction = (fixtureId: string) => {
    return existingPredictions.some(
      (p) =>
        p.externalFixtureId === fixtureId && p.externalRound === selectedRound,
    );
  };

  // Handle form submission
  const handleSubmitPredictions = async () => {
    setIsSubmitting(true);

    try {
      const predictionInputs: PredictionInput[] = Object.entries(
        predictions,
      ).map(([fixtureId, scores]) => ({
        externalFixtureId: fixtureId,
        externalRound: selectedRound,
        predictedHomeScore: parseInt(scores.home),
        predictedAwayScore: parseInt(scores.away),
      }));

      const result = await savePredictions(quiniela.id, predictionInputs);

      if (result.success) {
        toast({
          title: "¡Pronósticos guardados!",
          description: result.message,
        });

        // Invalidate and refetch predictions
        queryClient.invalidateQueries({
          queryKey: ["predictions", quiniela.id],
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar los pronósticos",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if we have any predictions to submit
  const hasValidPredictions = Object.keys(predictions).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Cargando partidos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error al cargar los partidos</div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 pb-24"
      style={{ scrollbarGutter: "stable", overflowX: "hidden" }}
    >
      {/* Round Selector Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pronóstico por partido</h2>
          {roundFixtures.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Se encontraron {roundFixtures.length} partidos
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
            const hasPrediction = hasExistingPrediction(
              fixture.fixture.id.toString(),
            );
            const allowPredictionsIndefinitely =
              process.env.NEXT_PUBLIC_ALLOW_PREDICTIONS_IDEFINITELY === "true";

            const matchStarted = allowPredictionsIndefinitely
              ? false
              : statusInfo.status !== "not-started";

            // Get odds for this fixture
            const fixtureOdds = oddsData?.[fixture.fixture.id];
            const allOdds = getAllOdds(fixtureOdds);
            const hasAnyOdds =
              allOdds.matchWinner ||
              allOdds.bothTeamsScore ||
              allOdds.cleanSheet;

            // Check if odds data was fetched but is empty (not available)
            const oddsNotAvailable =
              !isLoadingOdds && fixtureOdds?.response?.length === 0;

            if (fixture.fixture.id === 1491806) {
              console.log(fixtureOdds);
              console.log(isLoadingOdds);
              console.log(oddsNotAvailable);
              console.log(hasAnyOdds);
              console.log(allOdds);
            }

            return (
              <Card key={fixture.fixture.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Match Header */}
                  <div className="border-b bg-muted/30 px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
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

                      {/* Right Side - Odds Button */}
                      {isLoadingOdds ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Cargando...</span>
                        </Button>
                      ) : oddsNotAvailable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-not-allowed gap-2 opacity-50"
                          disabled
                        >
                          <Ban className="h-4 w-4" />
                          <span className="hidden sm:inline">
                            No disponible
                          </span>
                        </Button>
                      ) : hasAnyOdds ? (
                        <Drawer>
                          <DrawerTrigger asChild>
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-2"
                            >
                              <BarChart3 className="h-4 w-4" />
                              <span>Probabilidades</span>
                            </Button>
                          </DrawerTrigger>
                          <DrawerContent>
                            <div className="mx-auto w-full max-w-md">
                              <DrawerHeader>
                                <DrawerTitle className="flex items-center justify-center gap-2">
                                  <BarChart3 className="h-5 w-5 text-primary" />
                                  Probabilidades
                                </DrawerTitle>
                              </DrawerHeader>
                              <div className="px-4 pb-8">
                                {/* Match Info */}
                                <div className="mb-6 flex items-center justify-center gap-4">
                                  <div className="flex flex-col items-center gap-1">
                                    <Image
                                      src={fixture.teams.home.logo}
                                      alt={fixture.teams.home.name}
                                      width={40}
                                      height={40}
                                      className="h-10 w-10 object-contain"
                                    />
                                    <span className="text-xs font-medium">
                                      {fixture.teams.home.name}
                                    </span>
                                  </div>
                                  <span className="text-lg font-bold text-muted-foreground">
                                    vs
                                  </span>
                                  <div className="flex flex-col items-center gap-1">
                                    <Image
                                      src={fixture.teams.away.logo}
                                      alt={fixture.teams.away.name}
                                      width={40}
                                      height={40}
                                      className="h-10 w-10 object-contain"
                                    />
                                    <span className="text-xs font-medium">
                                      {fixture.teams.away.name}
                                    </span>
                                  </div>
                                </div>

                                {/* All Odds Sections */}
                                <div className="space-y-4">
                                  {/* Match Winner */}
                                  {allOdds.matchWinner && (
                                    <div className="space-y-2">
                                      <p className="text-center text-sm font-medium">
                                        Ganador del partido
                                      </p>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="rounded-lg bg-muted px-2 py-3 text-center">
                                          <p className="text-xs text-muted-foreground">
                                            Local
                                          </p>
                                          <p className="text-lg font-bold text-primary">
                                            {allOdds.matchWinner.home}
                                          </p>
                                        </div>
                                        <div className="rounded-lg bg-muted px-2 py-3 text-center">
                                          <p className="text-xs text-muted-foreground">
                                            Empate
                                          </p>
                                          <p className="text-lg font-bold text-primary">
                                            {allOdds.matchWinner.draw}
                                          </p>
                                        </div>
                                        <div className="rounded-lg bg-muted px-2 py-3 text-center">
                                          <p className="text-xs text-muted-foreground">
                                            Visitante
                                          </p>
                                          <p className="text-lg font-bold text-primary">
                                            {allOdds.matchWinner.away}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Both Teams Score */}
                                  {allOdds.bothTeamsScore && (
                                    <div className="space-y-2">
                                      <p className="text-center text-sm font-medium">
                                        Ambos equipos anotan
                                      </p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-muted px-2 py-3 text-center">
                                          <p className="text-xs text-muted-foreground">
                                            Sí
                                          </p>
                                          <p className="text-lg font-bold text-primary">
                                            {allOdds.bothTeamsScore.yes}
                                          </p>
                                        </div>
                                        <div className="rounded-lg bg-muted px-2 py-3 text-center">
                                          <p className="text-xs text-muted-foreground">
                                            No
                                          </p>
                                          <p className="text-lg font-bold text-primary">
                                            {allOdds.bothTeamsScore.no}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Clean Sheet */}
                                  {allOdds.cleanSheet && (
                                    <div className="space-y-2">
                                      <p className="text-center text-sm font-medium">
                                        Portería a cero
                                      </p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-muted px-2 py-3 text-center">
                                          <p className="text-xs text-muted-foreground">
                                            Local
                                          </p>
                                          <p className="text-lg font-bold text-primary">
                                            {allOdds.cleanSheet.home}
                                          </p>
                                        </div>
                                        <div className="rounded-lg bg-muted px-2 py-3 text-center">
                                          <p className="text-xs text-muted-foreground">
                                            Visitante
                                          </p>
                                          <p className="text-lg font-bold text-primary">
                                            {allOdds.cleanSheet.away}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </DrawerContent>
                        </Drawer>
                      ) : null}
                    </div>
                  </div>

                  {/* Match Content */}
                  <div className="p-4 sm:p-6">
                    {/* Mobile Layout */}
                    <div className="space-y-4 sm:hidden">
                      {/* Teams Row */}
                      <div className="flex items-center justify-between">
                        {/* Home Team */}
                        <div className="flex flex-1 flex-col items-center gap-2">
                          <Image
                            src={fixture.teams.home.logo}
                            alt={fixture.teams.home.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 object-contain"
                          />
                          <div className="text-center">
                            <h3 className="text-xs font-medium leading-tight">
                              {fixture.teams.home.name}
                            </h3>
                            <Badge variant="outline" className="mt-1 text-xs">
                              Local
                            </Badge>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="mx-4 flex-shrink-0 text-center">
                          <div className="rounded-lg bg-muted/50 px-3 py-1 text-lg font-bold">
                            {matchStatus}
                          </div>
                          {/* Subtle Prediction Status */}
                          <div className="mt-1">
                            {hasPrediction ? (
                              <span className="text-xs text-primary/70">
                                ✓ Pronosticado
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">
                                Sin pronóstico
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex flex-1 flex-col items-center gap-2">
                          <Image
                            src={fixture.teams.away.logo}
                            alt={fixture.teams.away.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 object-contain"
                          />
                          <div className="text-center">
                            <h3 className="text-xs font-medium leading-tight">
                              {fixture.teams.away.name}
                            </h3>
                            <Badge variant="outline" className="mt-1 text-xs">
                              Visitante
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Predictions Row */}
                      <div className="flex items-center justify-center gap-8">
                        <Select
                          value={
                            predictions[fixture.fixture.id.toString()]?.home ||
                            "0"
                          }
                          onValueChange={(value) =>
                            updatePrediction(
                              fixture.fixture.id.toString(),
                              "home",
                              value,
                            )
                          }
                          disabled={matchStarted}
                        >
                          <SelectTrigger className="mx-auto w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="7">7</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                              <SelectItem value="9">9</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>

                        <span className="text-muted-foreground">-</span>

                        <Select
                          value={
                            predictions[fixture.fixture.id.toString()]?.away ||
                            "0"
                          }
                          onValueChange={(value) =>
                            updatePrediction(
                              fixture.fixture.id.toString(),
                              "away",
                              value,
                            )
                          }
                          disabled={matchStarted}
                        >
                          <SelectTrigger className="mx-auto w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="7">7</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                              <SelectItem value="9">9</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
                      {/* Home Team */}
                      <div className="space-y-3 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Image
                            src={fixture.teams.home.logo}
                            alt={fixture.teams.home.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 object-contain"
                          />
                          <div>
                            <h3 className="text-sm font-medium sm:text-base">
                              {fixture.teams.home.name}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              Local
                            </Badge>
                          </div>
                        </div>

                        {/* Home Team Prediction */}
                        <Select
                          value={
                            predictions[fixture.fixture.id.toString()]?.home ||
                            "0"
                          }
                          onValueChange={(value) =>
                            updatePrediction(
                              fixture.fixture.id.toString(),
                              "home",
                              value,
                            )
                          }
                          disabled={matchStarted}
                        >
                          <SelectTrigger className="mx-auto w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="7">7</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                              <SelectItem value="9">9</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Score */}
                      <div className="text-center">
                        <div className="min-w-20 rounded-lg bg-muted/50 px-4 py-2 text-2xl font-bold sm:text-3xl">
                          {matchStatus}
                        </div>
                        {/* Subtle Prediction Status */}
                        <div className="mt-2">
                          {hasPrediction ? (
                            <span className="text-sm text-primary/70">
                              ✓ Pronosticado
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/60">
                              Sin pronóstico
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className="space-y-3 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Image
                            src={fixture.teams.away.logo}
                            alt={fixture.teams.away.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 object-contain"
                          />
                          <div>
                            <h3 className="text-sm font-medium sm:text-base">
                              {fixture.teams.away.name}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              Visitante
                            </Badge>
                          </div>
                        </div>

                        {/* Away Team Prediction */}
                        <Select
                          value={
                            predictions[fixture.fixture.id.toString()]?.away ||
                            "0"
                          }
                          onValueChange={(value) =>
                            updatePrediction(
                              fixture.fixture.id.toString(),
                              "away",
                              value,
                            )
                          }
                          disabled={matchStarted}
                        >
                          <SelectTrigger className="mx-auto w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="7">7</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                              <SelectItem value="9">9</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Sticky Submit Button */}
      {hasValidPredictions && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 p-4 pb-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:left-64 md:pb-4">
          <div className="mx-auto max-w-4xl px-4">
            <Button
              onClick={handleSubmitPredictions}
              disabled={isSubmitting}
              className="h-14 w-full text-sm font-semibold md:h-12 md:text-base"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-center md:flex-row md:items-center">
                    <span className="text-sm leading-tight md:text-base">
                      Pronosticar para {selectedRound}
                    </span>
                    <span className="text-xs opacity-75 md:ml-2">
                      ({Object.keys(predictions).length} partidos)
                    </span>
                  </div>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  Lock,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  savePredictions,
  PredictionInput,
} from "@/app/quinielas/predictions-action";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

interface RegistrarPronosticosProps {
  quiniela: Quiniela;
  userId: string;
}

const COLLAPSE_BREAKPOINT = 1200;

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

// Helper function to convert decimal odds to percentage
function oddsToPercentage(decimalOdds: string): string {
  const odds = parseFloat(decimalOdds);
  if (isNaN(odds) || odds <= 0) return "0%";
  const percentage = (1 / odds) * 100;
  return `${percentage.toFixed(0)}%`;
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

// Fixture Card Component
interface FixtureCardProps {
  fixture: FixtureData;
  predictions: Record<string, { home: string; away: string }>;
  updatePrediction: (
    fixtureId: string,
    team: "home" | "away",
    score: string,
  ) => void;
  hasExistingPrediction: (fixtureId: string) => boolean;
  oddsData: Record<number, OddsApiResponse> | undefined;
  isLoadingOdds: boolean;
  isFinished?: boolean;
}

function FixtureCard({
  fixture,
  predictions,
  updatePrediction,
  hasExistingPrediction,
  oddsData,
  isLoadingOdds,
  isFinished = false,
}: FixtureCardProps) {
  const { date, time } = formatDateTime(fixture.fixture.date);
  const matchStatus = getMatchStatus(fixture);
  const statusInfo = getMatchStatusInfo(fixture);
  const hasPrediction = hasExistingPrediction(fixture.fixture.id.toString());
  const allowPredictionsIndefinitely =
    process.env.NEXT_PUBLIC_ALLOW_PREDICTIONS_IDEFINITELY === "true";

  // Check if match starts within 5 minutes (300000ms)
  const matchDate = new Date(fixture.fixture.date);
  const now = new Date();
  const timeUntilMatch = matchDate.getTime() - now.getTime();
  const startsWithin5Minutes = timeUntilMatch <= 5 * 60 * 1000;

  const matchStarted = allowPredictionsIndefinitely
    ? false
    : statusInfo.status !== "not-started" || startsWithin5Minutes;

  // Get odds for this fixture
  const fixtureOdds = oddsData?.[fixture.fixture.id];
  const allOdds = getAllOdds(fixtureOdds);
  const hasAnyOdds =
    allOdds.matchWinner || allOdds.bothTeamsScore || allOdds.cleanSheet;

  // Check if odds data was fetched but is empty (not available)
  const oddsNotAvailable =
    !isLoadingOdds && fixtureOdds?.response?.length === 0;

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        isFinished
          ? "border-border/30 bg-muted/20 opacity-80"
          : matchStarted && !hasPrediction
            ? "border-destructive/30 bg-destructive/[0.02] ring-1 ring-destructive/20"
            : hasPrediction
              ? "border-primary/30 bg-primary/[0.02] ring-1 ring-primary/20"
              : "border-amber-500/50 ring-1 ring-amber-500/30"
      }`}
    >
      <CardContent className="p-0">
        {/* Prediction Status Indicator */}
        {isFinished ? (
          <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Partido finalizado</span>
            {hasPrediction ? (
              <Badge
                variant="secondary"
                className="ml-auto bg-primary/10 text-primary"
              >
                Pronóstico registrado
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="ml-auto bg-destructive/10 text-destructive"
              >
                Pronóstico no registrado
              </Badge>
            )}
          </div>
        ) : matchStarted && !hasPrediction ? (
          <div className="flex items-center gap-1.5 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
            <Lock className="h-3.5 w-3.5" />
            <span>Pronósticos bloqueados</span>
          </div>
        ) : hasPrediction ? (
          <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Pronóstico guardado</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
            <Clock className="h-3.5 w-3.5" />
            <span>Pendiente de pronóstico</span>
          </div>
        )}

        {/* Match Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-4 py-3">
          {/* Left Side - Date & Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>
                {date} {time}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {statusInfo.icon}
              <span className="text-xs text-muted-foreground">
                {statusInfo.statusText}
              </span>
            </div>
          </div>

          {/* Right Side - Odds Button */}
          {!isFinished && (
            <>
              {isLoadingOdds ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border-border/50"
                  disabled
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden text-xs sm:inline">Cargando...</span>
                </Button>
              ) : oddsNotAvailable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 cursor-not-allowed gap-2 opacity-50"
                  disabled
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span className="hidden text-xs sm:inline">No disponible</span>
                </Button>
              ) : hasAnyOdds ? (
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2 border-primary/30 bg-primary/5 text-xs hover:bg-primary/10"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Probabilidades</span>
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="mx-auto w-full max-w-md">
                      <DrawerHeader className="pb-2">
                        <DrawerTitle className="flex items-center justify-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/25">
                            <BarChart3 className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <span className="text-lg">Probabilidades</span>
                        </DrawerTitle>
                      </DrawerHeader>
                      <div className="mt-4 px-4 pb-8">
                        {/* Match Info */}
                        <div className="mb-6 rounded-xl border border-border/50 bg-muted/30 p-4">
                          <div className="flex items-center justify-center gap-6">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5">
                                <Image
                                  src={fixture.teams.home.logo}
                                  alt={fixture.teams.home.name}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 object-contain"
                                />
                              </div>
                              <span className="max-w-[100px] truncate text-center text-xs font-medium">
                                {fixture.teams.home.name}
                              </span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="rounded-lg bg-muted px-3 py-1.5 text-sm font-bold text-muted-foreground">
                                VS
                              </span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5">
                                <Image
                                  src={fixture.teams.away.logo}
                                  alt={fixture.teams.away.name}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 object-contain"
                                />
                              </div>
                              <span className="max-w-[100px] truncate text-center text-xs font-medium">
                                {fixture.teams.away.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* All Odds Sections */}
                        <div className="space-y-5">
                          {/* Match Winner */}
                          {allOdds.matchWinner && (
                            <div className="space-y-3">
                              <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Ganador del partido
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="group rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/30 p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm">
                                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Local
                                  </p>
                                  <p className="text-xl font-bold tabular-nums text-primary">
                                    {oddsToPercentage(allOdds.matchWinner.home)}
                                  </p>
                                </div>
                                <div className="group rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/30 p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm">
                                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Empate
                                  </p>
                                  <p className="text-xl font-bold tabular-nums text-primary">
                                    {oddsToPercentage(allOdds.matchWinner.draw)}
                                  </p>
                                </div>
                                <div className="group rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/30 p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm">
                                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Visitante
                                  </p>
                                  <p className="text-xl font-bold tabular-nums text-primary">
                                    {oddsToPercentage(allOdds.matchWinner.away)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Both Teams Score */}
                          {allOdds.bothTeamsScore && (
                            <div className="space-y-3">
                              <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Ambos equipos anotan
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="group rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/30 p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm">
                                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Sí
                                  </p>
                                  <p className="text-xl font-bold tabular-nums text-primary">
                                    {oddsToPercentage(allOdds.bothTeamsScore.yes)}
                                  </p>
                                </div>
                                <div className="group rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/30 p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm">
                                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    No
                                  </p>
                                  <p className="text-xl font-bold tabular-nums text-primary">
                                    {oddsToPercentage(allOdds.bothTeamsScore.no)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Clean Sheet */}
                          {allOdds.cleanSheet && (
                            <div className="space-y-3">
                              <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Portería a cero
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="group rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/30 p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm">
                                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Local
                                  </p>
                                  <p className="text-xl font-bold tabular-nums text-primary">
                                    {oddsToPercentage(allOdds.cleanSheet.home)}
                                  </p>
                                </div>
                                <div className="group rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/30 p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm">
                                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Visitante
                                  </p>
                                  <p className="text-xl font-bold tabular-nums text-primary">
                                    {oddsToPercentage(allOdds.cleanSheet.away)}
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
            </>
          )}
        </div>

        {/* Match Content */}
        <div className="p-4 sm:p-5">
          {isFinished ? (
            // Finished Match Layout - Clear distinction between result and prediction
            <>
              {/* Mobile Layout for Finished Matches */}
              <div className="space-y-4 sm:hidden">
                {/* Teams and Final Result */}
                <div className="flex items-center justify-between">
                  {/* Home Team */}
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                      <Image
                        src={fixture.teams.home.logo}
                        alt={fixture.teams.home.name}
                        width={36}
                        height={36}
                        className="h-9 w-9 object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xs font-medium leading-tight">
                        {fixture.teams.home.name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        Local
                      </span>
                    </div>
                  </div>

                  {/* Final Score */}
                  <div className="mx-2 flex flex-shrink-0 flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Resultado
                    </span>
                    <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 px-4 py-2 text-xl font-bold tabular-nums text-primary ring-1 ring-primary/20">
                      {matchStatus}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                      <Image
                        src={fixture.teams.away.logo}
                        alt={fixture.teams.away.name}
                        width={36}
                        height={36}
                        className="h-9 w-9 object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xs font-medium leading-tight">
                        {fixture.teams.away.name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        Visitante
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prediction Section */}
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                  {hasPrediction ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Tu pronóstico:
                        </span>
                        <div className="flex items-center gap-1.5 rounded-lg bg-background px-3 py-1.5 font-mono text-base font-bold shadow-sm ring-1 ring-border/50">
                          <span>{predictions[fixture.fixture.id.toString()]?.home ?? "0"}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{predictions[fixture.fixture.id.toString()]?.away ?? "0"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Ban className="h-4 w-4" />
                      <span className="text-sm">Sin pronóstico registrado</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Layout for Finished Matches */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
                {/* Home Team */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5">
                    <Image
                      src={fixture.teams.home.logo}
                      alt={fixture.teams.home.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium">{fixture.teams.home.name}</h3>
                    <span className="text-xs text-muted-foreground">Local</span>
                  </div>
                </div>

                {/* Scores Section */}
                <div className="flex flex-col items-center gap-3">
                  {/* Final Result */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Resultado final
                    </span>
                    <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 px-6 py-3 text-3xl font-bold tabular-nums text-primary ring-1 ring-primary/20">
                      {matchStatus}
                    </div>
                  </div>

                  {/* Prediction */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tu pronóstico
                    </span>
                    {hasPrediction ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-2 font-mono text-lg font-bold">
                        <span>{predictions[fixture.fixture.id.toString()]?.home ?? "0"}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{predictions[fixture.fixture.id.toString()]?.away ?? "0"}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-2 text-muted-foreground">
                        <Ban className="h-4 w-4" />
                        <span className="text-sm">Sin pronóstico</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5">
                    <Image
                      src={fixture.teams.away.logo}
                      alt={fixture.teams.away.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium">{fixture.teams.away.name}</h3>
                    <span className="text-xs text-muted-foreground">Visitante</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Active Match Layout - Original design with prediction inputs
            <>
              {/* Mobile Layout */}
              <div className="space-y-4 sm:hidden">
                {/* Teams Row */}
                <div className="flex items-center justify-between">
                  {/* Home Team */}
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                      <Image
                        src={fixture.teams.home.logo}
                        alt={fixture.teams.home.name}
                        width={36}
                        height={36}
                        className="h-9 w-9 object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xs font-medium leading-tight">
                        {fixture.teams.home.name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        Local
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="mx-2 flex-shrink-0 text-center">
                    <div className="rounded-lg bg-muted/50 px-4 py-2 text-xl font-bold tabular-nums">
                      {matchStatus}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                      <Image
                        src={fixture.teams.away.logo}
                        alt={fixture.teams.away.name}
                        width={36}
                        height={36}
                        className="h-9 w-9 object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xs font-medium leading-tight">
                        {fixture.teams.away.name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        Visitante
                      </span>
                    </div>
                  </div>
                </div>

                {/* Predictions Row */}
                <div className="flex items-center justify-center gap-4 rounded-lg bg-muted/30 p-3">
                  <div className="text-center">
                    <span className="mb-1 block text-[10px] text-muted-foreground">
                      Tu pronóstico
                    </span>
                    <div className="flex items-center gap-3">
                      <Select
                        value={
                          predictions[fixture.fixture.id.toString()]?.home ?? "0"
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
                        <SelectTrigger className="h-10 w-14 border-border/50 bg-background text-center text-lg font-bold">
                          <SelectValue>
                            {predictions[fixture.fixture.id.toString()]?.home ??
                              "0"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      <span className="text-lg font-bold text-muted-foreground">
                        -
                      </span>

                      <Select
                        value={
                          predictions[fixture.fixture.id.toString()]?.away ?? "0"
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
                        <SelectTrigger className="h-10 w-14 border-border/50 bg-background text-center text-lg font-bold">
                          <SelectValue>
                            {predictions[fixture.fixture.id.toString()]?.away ??
                              "0"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
                {/* Home Team */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5">
                    <Image
                      src={fixture.teams.home.logo}
                      alt={fixture.teams.home.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium">{fixture.teams.home.name}</h3>
                    <span className="text-xs text-muted-foreground">Local</span>
                  </div>

                  {/* Home Team Prediction */}
                  <Select
                    value={
                      predictions[fixture.fixture.id.toString()]?.home ?? "0"
                    }
                    onValueChange={(value) =>
                      updatePrediction(fixture.fixture.id.toString(), "home", value)
                    }
                    disabled={matchStarted}
                  >
                    <SelectTrigger className="h-12 w-16 border-border/50 bg-muted/30 text-center text-xl font-bold">
                      <SelectValue>
                        {predictions[fixture.fixture.id.toString()]?.home ?? "0"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Score */}
                <div className="text-center">
                  <div className="min-w-24 rounded-xl bg-muted/50 px-5 py-3 text-3xl font-bold tabular-nums">
                    {matchStatus}
                  </div>
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5">
                    <Image
                      src={fixture.teams.away.logo}
                      alt={fixture.teams.away.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium">{fixture.teams.away.name}</h3>
                    <span className="text-xs text-muted-foreground">Visitante</span>
                  </div>

                  {/* Away Team Prediction */}
                  <Select
                    value={
                      predictions[fixture.fixture.id.toString()]?.away ?? "0"
                    }
                    onValueChange={(value) =>
                      updatePrediction(fixture.fixture.id.toString(), "away", value)
                    }
                    disabled={matchStarted}
                  >
                    <SelectTrigger className="h-12 w-16 border-border/50 bg-muted/30 text-center text-xl font-bold">
                      <SelectValue>
                        {predictions[fixture.fixture.id.toString()]?.away ?? "0"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
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

  // Track sidebar collapsed state for sticky footer positioning
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for sidebar toggle events
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < COLLAPSE_BREAKPOINT) {
        setSidebarCollapsed(true);
      }
    };

    const handleSidebarToggle = (e: CustomEvent<{ collapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.collapsed);
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    window.addEventListener(
      "sidebarToggle",
      handleSidebarToggle as EventListener,
    );

    return () => {
      window.removeEventListener("resize", checkWidth);
      window.removeEventListener(
        "sidebarToggle",
        handleSidebarToggle as EventListener,
      );
    };
  }, []);

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

        // Handle null/undefined scores - default to "0"
        const homeScore =
          existingPrediction?.predictedHomeScore !== null &&
          existingPrediction?.predictedHomeScore !== undefined
            ? String(existingPrediction.predictedHomeScore)
            : "0";
        const awayScore =
          existingPrediction?.predictedAwayScore !== null &&
          existingPrediction?.predictedAwayScore !== undefined
            ? String(existingPrediction.predictedAwayScore)
            : "0";

        initialPredictions[fixtureId] = {
          home: homeScore,
          away: awayScore,
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

  // Helper to check if a fixture can still be predicted
  const canPredictFixture = (fixture: FixtureData): boolean => {
    const allowPredictionsIndefinitely =
      process.env.NEXT_PUBLIC_ALLOW_PREDICTIONS_IDEFINITELY === "true";
    if (allowPredictionsIndefinitely) return true;

    const statusInfo = getMatchStatusInfo(fixture);
    const matchDate = new Date(fixture.fixture.date);
    const now = new Date();
    const timeUntilMatch = matchDate.getTime() - now.getTime();
    const startsWithin5Minutes = timeUntilMatch <= 5 * 60 * 1000;

    return statusInfo.status === "not-started" && !startsWithin5Minutes;
  };

  // Get fixtures that can still be predicted
  const saveableFixtures = useMemo(() => {
    return roundFixtures.filter(canPredictFixture);
  }, [roundFixtures]);

  // Separate fixtures into active/upcoming and finished
  const { activeFixtures, finishedFixtures } = useMemo(() => {
    const active: FixtureData[] = [];
    const finished: FixtureData[] = [];

    roundFixtures.forEach((fixture) => {
      const statusInfo = getMatchStatusInfo(fixture);
      if (statusInfo.status === "finished") {
        finished.push(fixture);
      } else {
        active.push(fixture);
      }
    });

    return { activeFixtures: active, finishedFixtures: finished };
  }, [roundFixtures]);

  // State for finished matches collapsible
  const [finishedMatchesOpen, setFinishedMatchesOpen] = useState(false);

  // Handle form submission
  const handleSubmitPredictions = async () => {
    setIsSubmitting(true);

    try {
      // Only save predictions for fixtures that haven't started yet
      const saveableFixtureIds = new Set(
        saveableFixtures.map((f) => f.fixture.id.toString()),
      );

      const predictionInputs: PredictionInput[] = Object.entries(predictions)
        .filter(([fixtureId]) => saveableFixtureIds.has(fixtureId))
        .map(([fixtureId, scores]) => ({
          externalFixtureId: fixtureId,
          externalRound: selectedRound,
          predictedHomeScore: parseInt(scores.home),
          predictedAwayScore: parseInt(scores.away),
        }));

      if (predictionInputs.length === 0) {
        toast({
          title: "No hay pronósticos para guardar",
          description: "Todos los partidos ya han comenzado",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

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
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando partidos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <Ban className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-destructive">Error al cargar los partidos</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 pb-28"
      style={{ scrollbarGutter: "stable", overflowX: "hidden" }}
    >
      {/* Round Selector Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Pronóstico por partido</h2>
          {roundFixtures.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {roundFixtures.length} partidos
              </span>
              {(() => {
                const predictedCount = roundFixtures.filter((f) =>
                  hasExistingPrediction(f.fixture.id.toString()),
                ).length;
                const pendingCount = roundFixtures.length - predictedCount;
                return (
                  <>
                    {predictedCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-primary/10 text-primary hover:bg-primary/10"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {predictedCount} guardados
                      </Badge>
                    )}
                    {pendingCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 dark:text-amber-500"
                      >
                        <Clock className="h-3 w-3" />
                        {pendingCount} pendientes
                      </Badge>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Jornada:</span>
          <Select value={selectedRound} onValueChange={setSelectedRound}>
            <SelectTrigger className="w-44 border-border/50 bg-background">
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
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                No hay partidos disponibles para esta jornada
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active/Upcoming Fixtures */}
            {activeFixtures.length > 0 && (
              <div className="space-y-4">
                {activeFixtures.map((fixture) => (
                  <FixtureCard
                    key={fixture.fixture.id}
                    fixture={fixture}
                    predictions={predictions}
                    updatePrediction={updatePrediction}
                    hasExistingPrediction={hasExistingPrediction}
                    oddsData={oddsData}
                    isLoadingOdds={isLoadingOdds}
                  />
                ))}
              </div>
            )}

            {/* Finished Fixtures Collapsible */}
            {finishedFixtures.length > 0 && (
              <Collapsible
                open={finishedMatchesOpen}
                onOpenChange={setFinishedMatchesOpen}
                className="mt-6"
              >
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium">Partidos finalizados</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({finishedFixtures.length})
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                        finishedMatchesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  {finishedFixtures.map((fixture) => (
                    <FixtureCard
                      key={fixture.fixture.id}
                      fixture={fixture}
                      predictions={predictions}
                      updatePrediction={updatePrediction}
                      hasExistingPrediction={hasExistingPrediction}
                      oddsData={oddsData}
                      isLoadingOdds={isLoadingOdds}
                      isFinished
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Show message when all matches are finished */}
            {activeFixtures.length === 0 && finishedFixtures.length > 0 && (
              <Card className="border-primary/30 bg-primary/[0.02]">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-center font-medium">
                    Todos los partidos de esta jornada han finalizado
                  </p>
                  <p className="mt-1 text-center text-sm text-muted-foreground">
                    Expande la sección de abajo para ver los resultados
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Sticky Submit Button */}
      {hasValidPredictions && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/80 px-4 py-3  backdrop-blur-xl transition-[left] duration-300 sm:px-6 ${
            sidebarCollapsed ? "md:left-[72px]" : "md:left-72"
          }`}
        >
          <div className="max-w-[964px]">
            <Button
              onClick={handleSubmitPredictions}
              disabled={isSubmitting || saveableFixtures.length === 0}
              className="h-11 w-full gap-2 text-sm font-semibold shadow-lg shadow-primary/20"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Guardando pronósticos...
                </>
              ) : saveableFixtures.length === 0 ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Todos los partidos han comenzado</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Guardar {selectedRound}</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {saveableFixtures.length} partidos
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

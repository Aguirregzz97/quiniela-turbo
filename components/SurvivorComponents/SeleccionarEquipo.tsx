"use client";

import { useState, useMemo, useEffect } from "react";
import { useFixtures } from "@/hooks/api-football/useFixtures";
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
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Play,
  Ban,
  Loader2,
  BarChart3,
  Shield,
  Check,
  X,
  Lock,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Image from "next/image";
import { SurvivorGame } from "@/db/schema";
import { FixtureData } from "@/types/fixtures";
import { useSurvivorPicks } from "@/hooks/survivor/useSurvivorPicks";
import { useMultipleOdds } from "@/hooks/api-football/useOdds";
import { OddsApiResponse, Bet, Value } from "@/types/odds";
import {
  saveSurvivorPick,
  SurvivorPickInput,
} from "@/app/survivor/picks-action";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getDefaultActiveRound } from "@/components/QuinielaComponents/RegistrarPronosticos";

interface SeleccionarEquipoProps {
  survivorGame: SurvivorGame;
  userId: string;
}

// Helper function to filter fixtures by round
function filterFixturesByRound(
  fixtures: FixtureData[] | undefined,
  roundName: string,
): FixtureData[] {
  if (!fixtures) return [];
  return fixtures.filter((fixture) => fixture.league.round === roundName);
}

// Helper function to get match status info
function getMatchStatusInfo(fixture: FixtureData): {
  status: "not-started" | "in-progress" | "finished";
  statusText: string;
} {
  const statusShort = fixture.fixture.status.short;

  if (statusShort === "NS") {
    return {
      status: "not-started",
      statusText: "Por comenzar",
    };
  }

  if (statusShort === "FT" || statusShort === "AET" || statusShort === "PEN") {
    return {
      status: "finished",
      statusText: "Finalizado",
    };
  }

  return {
    status: "in-progress",
    statusText: "En progreso",
  };
}

// Helper function to format date and time
function formatDateTime(dateString: string): { date: string; time: string } {
  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

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

// Types for all odds
interface AllOdds {
  matchWinner: { home: string; draw: string; away: string } | null;
  bothTeamsScore: { yes: string; no: string } | null;
  cleanSheet: { home: string; away: string } | null;
}

// Helper function to convert decimal odds to percentage string
function oddsToPercentage(decimalOdds: string): string {
  const odds = parseFloat(decimalOdds);
  if (isNaN(odds) || odds <= 0) return "0%";
  const percentage = (1 / odds) * 100;
  return `${percentage.toFixed(0)}%`;
}

// Helper function to convert decimal odds to percentage number
function oddsToPercentageNumber(decimalOdds: string): number {
  const odds = parseFloat(decimalOdds);
  if (isNaN(odds) || odds <= 0) return 0;
  return Math.round((1 / odds) * 100);
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

// Helper function to get match winner odds as numbers for display
function getMatchWinnerOdds(
  oddsData: OddsApiResponse | undefined,
): { home: number; draw: number; away: number } | null {
  const allOdds = getAllOdds(oddsData);
  if (!allOdds.matchWinner) return null;

  return {
    home: oddsToPercentageNumber(allOdds.matchWinner.home),
    draw: oddsToPercentageNumber(allOdds.matchWinner.draw),
    away: oddsToPercentageNumber(allOdds.matchWinner.away),
  };
}

// Team Selection Card Component
interface TeamSelectionCardProps {
  fixture: FixtureData;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string, teamName: string, fixtureId: string) => void;
  usedTeamIds: Set<string>;
  currentRoundPickTeamId: string | null;
  oddsData: Record<number, OddsApiResponse> | undefined;
  isLoadingOdds: boolean;
  isSubmitting: boolean;
}

function TeamSelectionCard({
  fixture,
  selectedTeamId,
  onSelectTeam,
  usedTeamIds,
  currentRoundPickTeamId,
  oddsData,
  isLoadingOdds,
  isSubmitting,
}: TeamSelectionCardProps) {
  const { date, time } = formatDateTime(fixture.fixture.date);
  const statusInfo = getMatchStatusInfo(fixture);
  const allowPicksIndefinitely =
    process.env.NEXT_PUBLIC_ALLOW_PREDICTIONS_IDEFINITELY === "true";

  // Check if match starts within 5 minutes
  const matchDate = new Date(fixture.fixture.date);
  const now = new Date();
  const timeUntilMatch = matchDate.getTime() - now.getTime();
  const startsWithin5Minutes = timeUntilMatch <= 5 * 60 * 1000;

  const matchStarted = allowPicksIndefinitely
    ? false
    : statusInfo.status !== "not-started" || startsWithin5Minutes;

  const isFinished = statusInfo.status === "finished";

  // Get odds for this fixture
  const fixtureOdds = oddsData?.[fixture.fixture.id];
  const odds = getMatchWinnerOdds(fixtureOdds);
  const allOdds = getAllOdds(fixtureOdds);
  const hasAnyOdds =
    allOdds.matchWinner || allOdds.bothTeamsScore || allOdds.cleanSheet;
  const oddsNotAvailable =
    !isLoadingOdds && fixtureOdds?.response?.length === 0;

  const homeTeamId = fixture.teams.home.id.toString();
  const awayTeamId = fixture.teams.away.id.toString();

  const homeTeamUsed = usedTeamIds.has(homeTeamId);
  const awayTeamUsed = usedTeamIds.has(awayTeamId);

  const isHomeSelected = selectedTeamId === homeTeamId;
  const isAwaySelected = selectedTeamId === awayTeamId;

  const homeTeamIsCurrentPick = currentRoundPickTeamId === homeTeamId;
  const awayTeamIsCurrentPick = currentRoundPickTeamId === awayTeamId;

  // Get actual match result for finished matches
  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        isFinished
          ? "border-border/30 bg-muted/20 opacity-80"
          : matchStarted
            ? "border-border/50"
            : "border-border/50 hover:border-primary/30"
      }`}
    >
      <CardContent className="p-0">
        {/* Match Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-4 py-2.5">
          <div className="flex items-center gap-3 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{date}</span>
            <span className="text-muted-foreground">•</span>
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isFinished ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                {homeGoals} - {awayGoals}
              </Badge>
            ) : matchStarted ? (
              <Badge
                variant="secondary"
                className="gap-1 bg-red-500/10 text-xs text-red-600"
              >
                <Play className="h-3 w-3" />
                En vivo
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {statusInfo.statusText}
              </Badge>
            )}

            {/* Odds Drawer */}
            {!isFinished && (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoadingOdds}
                    className="h-7 gap-1.5 border-primary/30 bg-primary/5 px-2 text-xs hover:bg-primary/10"
                  >
                    {isLoadingOdds ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <BarChart3 className="h-3 w-3" />
                    )}
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
                      {hasAnyOdds ? (
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
                                    {oddsToPercentage(
                                      allOdds.bothTeamsScore.yes,
                                    )}
                                  </p>
                                </div>
                                <div className="group rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/30 p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm">
                                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    No
                                  </p>
                                  <p className="text-xl font-bold tabular-nums text-primary">
                                    {oddsToPercentage(
                                      allOdds.bothTeamsScore.no,
                                    )}
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
                      ) : oddsNotAvailable ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                            <BarChart3 className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Probabilidades no disponibles
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground/70">
                            Las probabilidades para este partido aún no están
                            disponibles
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          <p className="mt-3 text-sm text-muted-foreground">
                            Cargando probabilidades...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            )}
          </div>
        </div>

        {/* Teams Selection */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-0">
          {/* Home Team */}
          <button
            onClick={() =>
              !homeTeamUsed &&
              !matchStarted &&
              !isFinished &&
              onSelectTeam(
                homeTeamId,
                fixture.teams.home.name,
                fixture.fixture.id.toString(),
              )
            }
            disabled={
              homeTeamUsed || matchStarted || isFinished || isSubmitting
            }
            className={`group relative flex flex-col items-center gap-3 p-4 transition-all sm:p-5 ${
              homeTeamUsed
                ? "cursor-not-allowed bg-muted/30 opacity-50"
                : isHomeSelected
                  ? "bg-primary/10 ring-2 ring-inset ring-primary"
                  : homeTeamIsCurrentPick
                    ? "bg-green-500/10 ring-2 ring-inset ring-green-500"
                    : matchStarted || isFinished
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:bg-muted/50"
            }`}
          >
            {/* Used indicator */}
            {homeTeamUsed && (
              <div className="absolute right-2 top-2">
                <Badge
                  variant="secondary"
                  className="gap-1 bg-muted text-[10px]"
                >
                  <Ban className="h-2.5 w-2.5" />
                  Usado
                </Badge>
              </div>
            )}

            {/* Current pick indicator */}
            {homeTeamIsCurrentPick && !isHomeSelected && (
              <div className="absolute right-2 top-2">
                <Badge className="gap-1 bg-green-500 text-[10px]">
                  <Check className="h-2.5 w-2.5" />
                  Tu pick
                </Badge>
              </div>
            )}

            {/* Selected indicator */}
            {isHomeSelected && (
              <div className="absolute right-2 top-2">
                <Badge className="gap-1 bg-primary text-[10px]">
                  <Check className="h-2.5 w-2.5" />
                  Seleccionado
                </Badge>
              </div>
            )}

            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5 transition-transform sm:h-16 sm:w-16 ${
                !homeTeamUsed && !matchStarted && !isFinished
                  ? "group-hover:scale-105"
                  : ""
              }`}
            >
              <Image
                src={fixture.teams.home.logo}
                alt={fixture.teams.home.name}
                width={48}
                height={48}
                className="h-10 w-10 object-contain sm:h-12 sm:w-12"
              />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold sm:text-base">
                {fixture.teams.home.name}
              </h3>
              <span className="text-xs text-muted-foreground">Local</span>
            </div>

            {/* Win probability */}
            {odds && !isFinished && (
              <div className="mt-1 flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1">
                <BarChart3 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{odds.home}%</span>
              </div>
            )}

            {isLoadingOdds && !isFinished && (
              <div className="mt-1 flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
            )}
          </button>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center border-x border-border/50 bg-muted/10 px-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
              VS
            </div>
            {odds && !isFinished && (
              <div className="mt-2 text-center">
                <span className="text-[10px] text-muted-foreground">
                  Empate
                </span>
                <p className="text-xs font-medium">{odds.draw}%</p>
              </div>
            )}
          </div>

          {/* Away Team */}
          <button
            onClick={() =>
              !awayTeamUsed &&
              !matchStarted &&
              !isFinished &&
              onSelectTeam(
                awayTeamId,
                fixture.teams.away.name,
                fixture.fixture.id.toString(),
              )
            }
            disabled={
              awayTeamUsed || matchStarted || isFinished || isSubmitting
            }
            className={`group relative flex flex-col items-center gap-3 p-4 transition-all sm:p-5 ${
              awayTeamUsed
                ? "cursor-not-allowed bg-muted/30 opacity-50"
                : isAwaySelected
                  ? "bg-primary/10 ring-2 ring-inset ring-primary"
                  : awayTeamIsCurrentPick
                    ? "bg-green-500/10 ring-2 ring-inset ring-green-500"
                    : matchStarted || isFinished
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:bg-muted/50"
            }`}
          >
            {/* Used indicator */}
            {awayTeamUsed && (
              <div className="absolute left-2 top-2">
                <Badge
                  variant="secondary"
                  className="gap-1 bg-muted text-[10px]"
                >
                  <Ban className="h-2.5 w-2.5" />
                  Usado
                </Badge>
              </div>
            )}

            {/* Current pick indicator */}
            {awayTeamIsCurrentPick && !isAwaySelected && (
              <div className="absolute left-2 top-2">
                <Badge className="gap-1 bg-green-500 text-[10px]">
                  <Check className="h-2.5 w-2.5" />
                  Tu pick
                </Badge>
              </div>
            )}

            {/* Selected indicator */}
            {isAwaySelected && (
              <div className="absolute left-2 top-2">
                <Badge className="gap-1 bg-primary text-[10px]">
                  <Check className="h-2.5 w-2.5" />
                  Seleccionado
                </Badge>
              </div>
            )}

            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/5 transition-transform sm:h-16 sm:w-16 ${
                !awayTeamUsed && !matchStarted && !isFinished
                  ? "group-hover:scale-105"
                  : ""
              }`}
            >
              <Image
                src={fixture.teams.away.logo}
                alt={fixture.teams.away.name}
                width={48}
                height={48}
                className="h-10 w-10 object-contain sm:h-12 sm:w-12"
              />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold sm:text-base">
                {fixture.teams.away.name}
              </h3>
              <span className="text-xs text-muted-foreground">Visitante</span>
            </div>

            {/* Win probability */}
            {odds && !isFinished && (
              <div className="mt-1 flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1">
                <BarChart3 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{odds.away}%</span>
              </div>
            )}

            {isLoadingOdds && !isFinished && (
              <div className="mt-1 flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SeleccionarEquipo({
  survivorGame,
  userId,
}: SeleccionarEquipoProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fixturesParams = getFixturesParamsFromQuiniela(survivorGame);

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

  const { data: existingPicks = [] } = useSurvivorPicks(survivorGame.id);

  // Get available rounds from survivor game data
  const availableRounds = survivorGame.roundsSelected || [];

  // Determine default active round
  const defaultRound = getDefaultActiveRound(availableRounds);
  const [selectedRound, setSelectedRound] = useState<string>(defaultRound);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter fixtures by selected round
  const roundFixtures = useMemo(() => {
    return filterFixturesByRound(fixturesData?.response, selectedRound);
  }, [fixturesData?.response, selectedRound]);

  // Check if the round is locked (any match has started or is within 5 minutes)
  const allowPicksIndefinitely =
    process.env.NEXT_PUBLIC_ALLOW_PREDICTIONS_IDEFINITELY === "true";

  const isRoundLocked = useMemo(() => {
    if (allowPicksIndefinitely) return false;
    if (roundFixtures.length === 0) return false;

    const now = new Date();

    return roundFixtures.some((fixture) => {
      const matchDate = new Date(fixture.fixture.date);
      const timeUntilMatch = matchDate.getTime() - now.getTime();
      const startsWithin5Minutes = timeUntilMatch <= 5 * 60 * 1000;
      const statusShort = fixture.fixture.status.short;
      const hasStarted = statusShort !== "NS";

      return hasStarted || startsWithin5Minutes;
    });
  }, [roundFixtures, allowPicksIndefinitely]);

  // Get the first match time for display
  const firstMatchTime = useMemo(() => {
    if (roundFixtures.length === 0) return null;

    const sortedFixtures = [...roundFixtures].sort(
      (a, b) =>
        new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime(),
    );

    return new Date(sortedFixtures[0].fixture.date);
  }, [roundFixtures]);

  // Get fixture IDs for odds fetching
  const fixtureIds = useMemo(() => {
    return roundFixtures.map((fixture) => fixture.fixture.id);
  }, [roundFixtures]);

  // Fetch odds for all fixtures in the round
  const { data: oddsData, isLoading: isLoadingOdds } =
    useMultipleOdds(fixtureIds);

  // Get all used team IDs (teams already picked in previous rounds)
  const usedTeamIds = useMemo(() => {
    const ids = new Set<string>();
    existingPicks.forEach((pick) => {
      // Don't include current round's pick in used teams
      if (pick.externalRound !== selectedRound) {
        ids.add(pick.externalPickedTeamId);
      }
    });
    return ids;
  }, [existingPicks, selectedRound]);

  // Get current round's pick
  const currentRoundPick = useMemo(() => {
    return existingPicks.find((pick) => pick.externalRound === selectedRound);
  }, [existingPicks, selectedRound]);

  // Initialize selected team from existing pick when round changes
  useEffect(() => {
    if (currentRoundPick) {
      setSelectedTeamId(currentRoundPick.externalPickedTeamId);
      setSelectedTeamName(currentRoundPick.externalPickedTeamName);
      setSelectedFixtureId(currentRoundPick.externalFixtureId);
    } else {
      setSelectedTeamId(null);
      setSelectedTeamName(null);
      setSelectedFixtureId(null);
    }
  }, [currentRoundPick, selectedRound]);

  // Handle team selection
  const handleSelectTeam = (
    teamId: string,
    teamName: string,
    fixtureId: string,
  ) => {
    // Don't allow selection if round is locked
    if (isRoundLocked) return;

    if (selectedTeamId === teamId) {
      // Deselect if clicking the same team
      setSelectedTeamId(null);
      setSelectedTeamName(null);
      setSelectedFixtureId(null);
    } else {
      setSelectedTeamId(teamId);
      setSelectedTeamName(teamName);
      setSelectedFixtureId(fixtureId);
    }
  };

  // Handle save pick
  const handleSavePick = async () => {
    if (!selectedTeamId || !selectedTeamName || !selectedFixtureId) return;

    setIsSubmitting(true);

    try {
      const pickInput: SurvivorPickInput = {
        externalFixtureId: selectedFixtureId,
        externalRound: selectedRound,
        externalPickedTeamId: selectedTeamId,
        externalPickedTeamName: selectedTeamName,
      };

      const result = await saveSurvivorPick(survivorGame.id, pickInput);

      if (result.success) {
        toast({
          title: "¡Selección guardada!",
          description: result.message,
        });

        // Invalidate and refetch picks
        queryClient.invalidateQueries({
          queryKey: ["survivor-picks", survivorGame.id],
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
        description: "Error al guardar la selección",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if selection has changed from saved pick
  const hasChanges = useMemo(() => {
    if (!currentRoundPick && selectedTeamId) return true;
    if (
      currentRoundPick &&
      selectedTeamId !== currentRoundPick.externalPickedTeamId
    )
      return true;
    return false;
  }, [currentRoundPick, selectedTeamId]);

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
    <div className="space-y-6 pb-28">
      {/* Round Selector Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Selecciona tu equipo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige un equipo que creas que ganará o empatará
          </p>
          {currentRoundPick && (
            <div className="mt-2 flex items-center gap-2">
              <Badge className="gap-1.5 bg-green-500">
                <Shield className="h-3 w-3" />
                Pick actual: {currentRoundPick.externalPickedTeamName}
              </Badge>
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

      {/* Round Locked Warning */}
      {isRoundLocked && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <Lock className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-500">
                Jornada bloqueada
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ya no puedes cambiar tu selección porque al menos un partido de
                esta jornada ya ha comenzado o está por comenzar.
                {currentRoundPick && (
                  <span className="mt-1 block font-medium">
                    Tu pick: {currentRoundPick.externalPickedTeamName}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Used Teams Info */}
      {usedTeamIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Ban className="h-4 w-4" />
          <span>
            {usedTeamIds.size} equipo{usedTeamIds.size !== 1 ? "s" : ""} no
            disponible{usedTeamIds.size !== 1 ? "s" : ""} (ya elegido
            {usedTeamIds.size !== 1 ? "s" : ""} en otra jornada)
          </span>
        </div>
      )}

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
          roundFixtures.map((fixture) => (
            <TeamSelectionCard
              key={fixture.fixture.id}
              fixture={fixture}
              selectedTeamId={selectedTeamId}
              onSelectTeam={handleSelectTeam}
              usedTeamIds={usedTeamIds}
              currentRoundPickTeamId={
                currentRoundPick?.externalPickedTeamId ?? null
              }
              oddsData={oddsData}
              isLoadingOdds={isLoadingOdds}
              isSubmitting={isSubmitting}
            />
          ))
        )}
      </div>

      {/* Sticky Save Button - Hidden when round is locked */}
      {!isRoundLocked && (selectedTeamId || currentRoundPick) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/80 px-4 py-3 backdrop-blur-xl md:left-72">
          <div className="max-w-[964px]">
            {selectedTeamId ? (
              <div className="flex items-center gap-3">
                <div className="hidden flex-1 items-center gap-3 rounded-lg bg-muted/50 px-4 py-2 sm:flex">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium">{selectedTeamName}</span>
                  {hasChanges && (
                    <Badge variant="secondary" className="ml-auto">
                      Sin guardar
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={handleSavePick}
                  disabled={isSubmitting || !hasChanges}
                  className="h-11 flex-1 gap-2 text-sm font-semibold shadow-lg shadow-primary/20 sm:flex-none sm:px-8"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : !hasChanges ? (
                    <>
                      <Check className="h-4 w-4" />
                      Guardado
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Guardar selección
                    </>
                  )}
                </Button>
                {hasChanges && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentRoundPick) {
                        setSelectedTeamId(
                          currentRoundPick.externalPickedTeamId,
                        );
                        setSelectedTeamName(
                          currentRoundPick.externalPickedTeamName,
                        );
                        setSelectedFixtureId(
                          currentRoundPick.externalFixtureId,
                        );
                      } else {
                        setSelectedTeamId(null);
                        setSelectedTeamName(null);
                        setSelectedFixtureId(null);
                      }
                    }}
                    disabled={isSubmitting}
                    className="h-11"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5" />
                <span>Selecciona un equipo para esta jornada</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

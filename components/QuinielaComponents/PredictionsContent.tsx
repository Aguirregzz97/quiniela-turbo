"use client";

import { useState, useMemo } from "react";
import { useFixtures } from "@/hooks/api-football/useFixtures";
import { getFixturesParamsFromQuiniela } from "@/utils/quinielaHelpers";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, CheckCircle2, Play } from "lucide-react";
import Image from "next/image";
import { Quiniela } from "@/db/schema";
import { FixtureData } from "@/types/fixtures";

interface PredictionsContentProps {
  quiniela: Quiniela;
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
    // Before all rounds, use first round
    return firstRound.roundName;
  } else if (today > lastRoundEnd) {
    // After all rounds, use last round
    return lastRound.roundName;
  }

  // Default to first round
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
    return "N.I.";
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
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
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

export default function PredictionsContent({
  quiniela,
}: PredictionsContentProps) {
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

  // Get available rounds from quiniela data
  const availableRounds = quiniela.roundsSelected || [];

  // Determine default active round
  const defaultRound = getDefaultActiveRound(availableRounds);
  const [selectedRound, setSelectedRound] = useState<string>(defaultRound);

  // Filter fixtures by selected round
  const roundFixtures = useMemo(() => {
    return filterFixturesByRound(fixturesData?.response, selectedRound);
  }, [fixturesData?.response, selectedRound]);

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
    <div className="space-y-6">
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

            return (
              <Card key={fixture.fixture.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Match Header */}
                  <div className="border-b bg-muted/30 px-4 py-3">
                    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        <span>
                          {date} {time}
                        </span>
                        <div className="flex items-center gap-1">
                          {statusInfo.icon}
                        </div>
                      </div>
                      {fixture.fixture.venue && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="break-words sm:max-w-48 sm:truncate">
                            {fixture.fixture.venue.name}
                          </span>
                        </div>
                      )}
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
                        <div className="mx-4 flex-shrink-0">
                          <div className="rounded-lg bg-muted/50 px-3 py-1 text-lg font-bold">
                            {matchStatus}
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
                        <Select defaultValue="0">
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

                        <Select defaultValue="0">
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
                        <Select defaultValue="0">
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
                        <Select defaultValue="0">
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
    </div>
  );
}

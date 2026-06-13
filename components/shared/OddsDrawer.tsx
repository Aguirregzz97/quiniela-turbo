"use client";

import { useState, type ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, AlertCircle, Hourglass } from "lucide-react";
import Image from "next/image";
import { useOdds } from "@/hooks/api-football/useOdds";
import type { FixtureData } from "@/types/fixtures";
import type { OddsApiResponse, Bet, Value } from "@/types/odds";
import { Last5Games } from "@/components/shared/Last5Games";

// Bet IDs from api-football. These are stable across requests.
const MATCH_WINNER_BET_ID = 1;
const BOTH_TEAMS_SCORE_BET_ID = 8;
const CLEAN_SHEET_HOME_BET_ID = 27;
const CLEAN_SHEET_AWAY_BET_ID = 28;

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

function oddsToPercentage(decimalOdds: string): string {
  const odds = parseFloat(decimalOdds);
  if (isNaN(odds) || odds <= 0) return "0%";
  const percentage = (1 / odds) * 100;
  return `${percentage.toFixed(0)}%`;
}

function getAllOdds(oddsData: OddsApiResponse | undefined): AllOdds {
  const result: AllOdds = {
    matchWinner: null,
    bothTeamsScore: null,
    cleanSheet: null,
  };

  if (!oddsData?.response?.length) return result;

  const bookmaker = oddsData.response[0]?.bookmakers[0];
  if (!bookmaker?.bets) return result;

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

interface OddsDrawerProps {
  fixture: FixtureData;
  /**
   * Optional list of fixtures to feed the per-team "Last 5 games" widget
   * inside the drawer's match-info panel. Pass `undefined` to hide the
   * Last 5 strip and just render team logos + names.
   */
  tournamentFixtures?: FixtureData[];
  /**
   * Whether to render the drawer trigger button at all. Use `false` to
   * suppress on finished matches where odds aren't useful.
   */
  showTrigger?: boolean;
  /**
   * Render-prop slot for the trigger button. If omitted we render a
   * standard "Probabilidades" outline button. Pass your own when you
   * need a different size/variant (e.g. the survivor compact pill).
   */
  renderTrigger?: (props: { onClick: () => void }) => ReactNode;
}

/**
 * Single-fixture odds drawer. Fetches odds **only when opened** so we
 * don't burn through api-football's 300/min Pro cap on every page load
 * — most users never click into the probabilities for any given match.
 *
 * UI states inside the drawer body, in priority order:
 *   1. Loading (spinner + label)
 *   2. Rate-limit error (warm warning + "try again soon" hint)
 *   3. Generic error (red banner + retry button)
 *   4. No-odds-available (api returned an empty response — the fixture
 *      simply isn't in Bet365's book)
 *   5. Populated (Match Winner / BTTS / Clean Sheet sections)
 */
export default function OddsDrawer({
  fixture,
  tournamentFixtures,
  showTrigger = true,
  renderTrigger,
}: OddsDrawerProps) {
  const [open, setOpen] = useState(false);

  // The `enabled: open` flag is the whole point of this component —
  // useOdds doesn't fire until the user actually opens the drawer.
  const {
    data: oddsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useOdds(fixture.fixture.id, { enabled: open });

  const allOdds = oddsData ? getAllOdds(oddsData) : null;
  const hasAnyOdds =
    !!allOdds &&
    !!(allOdds.matchWinner || allOdds.bothTeamsScore || allOdds.cleanSheet);
  const oddsNotAvailable =
    !!oddsData && oddsData.response?.length === 0 && !error;
  const isRateLimit =
    !!error && (error as { isRateLimit?: boolean }).isRateLimit === true;

  if (!showTrigger) return null;

  const trigger = renderTrigger ? (
    renderTrigger({ onClick: () => setOpen(true) })
  ) : (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-2 border-primary/30 bg-primary/5 text-xs hover:bg-primary/10"
    >
      <BarChart3 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Probabilidades</span>
    </Button>
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
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
            {/* Match Info panel — shown in every state so the user
                can see which match they're looking at even mid-load. */}
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
                  {tournamentFixtures && (
                    <Last5Games
                      teamId={fixture.teams.home.id}
                      tournamentFixtures={tournamentFixtures}
                    />
                  )}
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
                  {tournamentFixtures && (
                    <Last5Games
                      teamId={fixture.teams.away.id}
                      tournamentFixtures={tournamentFixtures}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Body — one of: loading / rate limit / error / empty / data. */}
            {isLoading || isFetching ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Cargando probabilidades...
                </p>
              </div>
            ) : isRateLimit ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/5 py-6 text-center">
                <Hourglass className="mb-3 h-8 w-8 text-amber-600" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
                  Límite de solicitudes alcanzado
                </p>
                <p className="mt-1 max-w-xs text-xs text-amber-700/70 dark:text-amber-500/70">
                  Estamos consultando muchas probabilidades a la vez. Inténtalo
                  de nuevo en un momento.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 h-8 border-amber-500/40 bg-amber-500/10 text-xs hover:bg-amber-500/20"
                  onClick={() => refetch()}
                >
                  Reintentar
                </Button>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-6 text-center">
                <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                  No se pudieron cargar las probabilidades
                </p>
                <p className="mt-1 max-w-xs text-xs text-destructive/70">
                  Hubo un problema obteniendo los datos. Verifica tu conexión e
                  inténtalo de nuevo.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 h-8 border-destructive/40 bg-destructive/10 text-xs hover:bg-destructive/20"
                  onClick={() => refetch()}
                >
                  Reintentar
                </Button>
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
                  Las probabilidades para este partido aún no están disponibles
                </p>
              </div>
            ) : hasAnyOdds && allOdds ? (
              <div className="space-y-5">
                {allOdds.matchWinner && (
                  <div className="space-y-3">
                    <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ganador del partido
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <OddCell
                        label="Local"
                        value={oddsToPercentage(allOdds.matchWinner.home)}
                      />
                      <OddCell
                        label="Empate"
                        value={oddsToPercentage(allOdds.matchWinner.draw)}
                      />
                      <OddCell
                        label="Visitante"
                        value={oddsToPercentage(allOdds.matchWinner.away)}
                      />
                    </div>
                  </div>
                )}
                {allOdds.bothTeamsScore && (
                  <div className="space-y-3">
                    <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ambos equipos anotan
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <OddCell
                        label="Sí"
                        value={oddsToPercentage(allOdds.bothTeamsScore.yes)}
                      />
                      <OddCell
                        label="No"
                        value={oddsToPercentage(allOdds.bothTeamsScore.no)}
                      />
                    </div>
                  </div>
                )}
                {allOdds.cleanSheet && (
                  <div className="space-y-3">
                    <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Portería a cero
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <OddCell
                        label="Local"
                        value={oddsToPercentage(allOdds.cleanSheet.home)}
                      />
                      <OddCell
                        label="Visitante"
                        value={oddsToPercentage(allOdds.cleanSheet.away)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function OddCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="group rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/30 p-3 text-center transition-all hover:border-primary/30 hover:shadow-sm">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums text-primary">{value}</p>
    </div>
  );
}

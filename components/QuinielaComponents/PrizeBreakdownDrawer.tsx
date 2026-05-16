"use client";

import { useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, Crown, Trophy, Coins, AlertCircle } from "lucide-react";
import { useFixtures } from "@/hooks/api-football/useFixtures";
import { useAllPredictions } from "@/hooks/predictions/useAllPredictions";
import { getFixturesParamsFromQuiniela } from "@/utils/quinielaHelpers";
import type { Quiniela } from "@/db/schema";
import {
  computePrizeBreakdown,
  type PrizeDistribution,
  type RoundPrizeBreakdown,
  type TournamentPrizeBreakdown,
  type UserPrizeAward,
  type UserTotalAward,
} from "@/lib/prizes";

interface Participant {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

interface PrizeBreakdownDrawerProps {
  quiniela: Quiniela;
  participants: Participant[];
  exactPoints: number;
  correctResultPoints: number;
  moneyToEnter: number | null;
  prizeDistribution: PrizeDistribution[] | null;
  moneyPerRoundToEnter: number | null;
  prizeDistributionPerRound: PrizeDistribution[] | null;
}

function formatMoney(amount: number): string {
  // Always show two decimals only when the prize isn't a clean integer
  // (cents matter when 1st place ties and the pool gets split). Avoids
  // "$3,500.00" everywhere when rounds usually pay round numbers.
  const rounded = Math.round(amount * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  return `$${rounded.toLocaleString("es-MX", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function UserPill({
  user,
  size = "md",
}: {
  user: { name: string | null; email: string | null; image: string | null };
  size?: "sm" | "md";
}) {
  const display = user.name || user.email || "Usuario";
  const initial = display[0]?.toUpperCase() ?? "?";
  const dim = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className={`${dim} flex-shrink-0`}>
        <AvatarImage src={user.image || undefined} alt={display} />
        <AvatarFallback className="bg-primary/10 text-[10px] font-medium">
          {initial}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-xs font-medium">{display}</span>
    </div>
  );
}

function PositionBadge({ position }: { position: number }) {
  const styles =
    position === 1
      ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900"
      : position === 2
        ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800"
        : position === 3
          ? "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100"
          : "bg-muted text-muted-foreground";
  return (
    <div
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${styles}`}
    >
      {position === 1 ? <Crown className="h-3.5 w-3.5" /> : position}
    </div>
  );
}

function StatusPill({ finalized }: { finalized: boolean }) {
  return finalized ? (
    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
      Final
    </span>
  ) : (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
      Proyección
    </span>
  );
}

function AwardRow({ award }: { award: UserPrizeAward }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/30 px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <PositionBadge position={award.position} />
        <UserPill user={award.user} size="sm" />
      </div>
      <div className="flex flex-shrink-0 flex-col items-end leading-tight">
        <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatMoney(award.amount)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {award.points} pt{award.points === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

function RoundCard({ round }: { round: RoundPrizeBreakdown }) {
  const hasFixturesScored = round.ranking.some((r) => r.points > 0);
  const projectedLeaders = round.ranking.filter(
    (r) => r.position === 1 && r.points > 0,
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="truncate text-sm font-semibold">{round.roundName}</h4>
        <StatusPill finalized={round.isFinalized} />
      </div>

      {round.prizePool > 0 ? (
        <p className="mb-3 text-[11px] text-muted-foreground">
          Bolsa de jornada:{" "}
          <span className="font-semibold text-foreground">
            {formatMoney(round.prizePool)}
          </span>
        </p>
      ) : (
        <p className="mb-3 text-[11px] text-muted-foreground italic">
          Esta jornada no tiene premio configurado.
        </p>
      )}

      {/* Awards */}
      {round.awards.length > 0 ? (
        <div className="space-y-1.5">
          {round.awards.map((award) => (
            <AwardRow
              key={`${round.roundName}-${award.user.id}-${award.position}`}
              award={award}
            />
          ))}
        </div>
      ) : round.prizePool === 0 ? null : !hasFixturesScored ? (
        <p className="text-xs italic text-muted-foreground">
          Aún no hay puntos en esta jornada.
        </p>
      ) : (
        <p className="text-xs italic text-muted-foreground">
          Nadie ha sumado puntos suficientes para premio.
        </p>
      )}

      {/* Projected leader hint when round still in progress */}
      {!round.isFinalized && projectedLeaders.length > 0 && (
        <p className="mt-3 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
          Líder actual:{" "}
          <span className="font-medium text-foreground">
            {projectedLeaders.map((l) => l.user.name || l.user.email).join(", ")}
          </span>{" "}
          con{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {projectedLeaders[0].points} pt
            {projectedLeaders[0].points === 1 ? "" : "s"}
          </span>
        </p>
      )}
    </div>
  );
}

function TournamentCard({
  tournament,
}: {
  tournament: TournamentPrizeBreakdown;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Premio del Torneo</h4>
        </div>
        <StatusPill finalized={tournament.isFinalized} />
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Bolsa total:{" "}
        <span className="font-semibold text-foreground">
          {formatMoney(tournament.prizePool)}
        </span>
      </p>

      {tournament.awards.length > 0 ? (
        <div className="space-y-1.5">
          {tournament.awards.map((award) => (
            <AwardRow
              key={`tournament-${award.user.id}-${award.position}`}
              award={award}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">
          Aún no hay puntos suficientes para repartir el premio.
        </p>
      )}
    </div>
  );
}

function TotalsCard({ totals }: { totals: UserTotalAward[] }) {
  if (!totals.length) return null;
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <h4 className="text-sm font-semibold">Totales por participante</h4>
      </div>
      <div className="space-y-1.5">
        {totals.map((t) => {
          const lines: string[] = [];
          if (t.perRoundAmount > 0) {
            lines.push(`${formatMoney(t.perRoundAmount)} en jornadas`);
          }
          if (t.tournamentAmount > 0) {
            lines.push(`${formatMoney(t.tournamentAmount)} del torneo`);
          }
          return (
            <div
              key={t.user.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card px-2.5 py-2"
            >
              <UserPill user={t.user} size="sm" />
              <div className="flex flex-shrink-0 flex-col items-end leading-tight">
                <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMoney(t.total)}
                </span>
                {lines.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {lines.join(" + ")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] italic leading-relaxed text-muted-foreground">
        Solo se acumulan jornadas finalizadas y el torneo si ya terminó.
        Las proyecciones no se suman aquí.
      </p>
    </div>
  );
}

export default function PrizeBreakdownDrawer({
  quiniela,
  participants,
  exactPoints,
  correctResultPoints,
  moneyToEnter,
  prizeDistribution,
  moneyPerRoundToEnter,
  prizeDistributionPerRound,
}: PrizeBreakdownDrawerProps) {
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

  const selectedRoundNames = useMemo(() => {
    const rounds = (quiniela.roundsSelected ||
      []) as { roundName: string; dates: string[] }[];
    return rounds.map((r) => r.roundName);
  }, [quiniela.roundsSelected]);

  const breakdown = useMemo(() => {
    if (!fixturesData?.response) return null;
    return computePrizeBreakdown({
      fixtures: fixturesData.response,
      predictions: allPredictions,
      selectedRoundNames,
      participantCount: participants.length,
      exactPoints,
      correctResultPoints,
      moneyToEnter: moneyToEnter ?? 0,
      prizeDistribution: prizeDistribution ?? null,
      moneyPerRoundToEnter: moneyPerRoundToEnter ?? 0,
      prizeDistributionPerRound: prizeDistributionPerRound ?? null,
      participants: participants.map((p) => ({
        id: p.userId,
        name: p.userName,
        email: p.userEmail,
        image: p.userImage,
      })),
    });
  }, [
    fixturesData?.response,
    allPredictions,
    selectedRoundNames,
    participants,
    exactPoints,
    correctResultPoints,
    moneyToEnter,
    prizeDistribution,
    moneyPerRoundToEnter,
    prizeDistributionPerRound,
  ]);

  const hasAnyPrizeConfigured =
    (moneyToEnter ?? 0) > 0 || (moneyPerRoundToEnter ?? 0) > 0;

  const isLoading = fixturesLoading || predictionsLoading;
  const error = fixturesError || predictionsError;

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 border-emerald-500/30 bg-emerald-500/5 text-xs hover:bg-emerald-500/10"
        >
          <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Premios</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="data-[vaul-drawer-direction=right]:w-[92%] data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader className="border-b border-border/50 px-4">
          <DrawerTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/25">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg">Premios</span>
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!hasAnyPrizeConfigured ? (
            <EmptyState
              title="Esta quiniela no tiene premios configurados"
              description="Configura un costo de entrada por torneo o por jornada en los ajustes para ver el desglose."
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">
                Error al cargar los datos
              </p>
            </div>
          ) : !breakdown ? (
            <EmptyState
              title="Sin datos suficientes"
              description="Aún no hay partidos disponibles para calcular premios."
            />
          ) : (
            <div className="space-y-5">
              {/* Summary banner */}
              <SummaryBanner
                participantCount={participants.length}
                moneyToEnter={moneyToEnter ?? 0}
                moneyPerRoundToEnter={moneyPerRoundToEnter ?? 0}
                roundsCount={selectedRoundNames.length}
              />

              {/* Tournament prize */}
              {breakdown.tournament && (
                <section>
                  <TournamentCard tournament={breakdown.tournament} />
                </section>
              )}

              {/* Per-round prizes */}
              {(moneyPerRoundToEnter ?? 0) > 0 && breakdown.rounds.length > 0 && (
                <section>
                  <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Premios por jornada
                  </h3>
                  <div className="space-y-2.5">
                    {breakdown.rounds.map((round) => (
                      <RoundCard key={round.roundName} round={round} />
                    ))}
                  </div>
                </section>
              )}

              {/* Per-user totals */}
              {breakdown.totalsByUser.length > 0 && (
                <section>
                  <TotalsCard totals={breakdown.totalsByUser} />
                </section>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <DollarSign className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SummaryBanner({
  participantCount,
  moneyToEnter,
  moneyPerRoundToEnter,
  roundsCount,
}: {
  participantCount: number;
  moneyToEnter: number;
  moneyPerRoundToEnter: number;
  roundsCount: number;
}) {
  const tournamentPool =
    moneyToEnter > 0 ? moneyToEnter * participantCount : 0;
  const roundPool =
    moneyPerRoundToEnter > 0 ? moneyPerRoundToEnter * participantCount : 0;
  const totalAcrossRounds = roundPool * roundsCount;
  const grandTotal = tournamentPool + totalAcrossRounds;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-3 sm:p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Resumen de bolsa
      </p>
      <div className="grid grid-cols-2 gap-3">
        {tournamentPool > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground">Torneo</p>
            <p className="text-sm font-bold tabular-nums">
              {formatMoney(tournamentPool)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatMoney(moneyToEnter)} × {participantCount}
            </p>
          </div>
        )}
        {roundPool > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground">
              Por jornada × {roundsCount}
            </p>
            <p className="text-sm font-bold tabular-nums">
              {formatMoney(totalAcrossRounds)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatMoney(roundPool)} cada una
            </p>
          </div>
        )}
      </div>
      {grandTotal > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            Total a repartir
          </span>
          <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoney(grandTotal)}
          </span>
        </div>
      )}
    </div>
  );
}

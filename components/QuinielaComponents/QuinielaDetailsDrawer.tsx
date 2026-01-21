"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Info, X, DollarSign, Target, CheckCircle, XCircle, Trophy, Calendar } from "lucide-react";
import Image from "next/image";
import ClickableJoinCode from "./ClickableJoinCode";
import CopyJoinLinkButton from "./CopyJoinLinkButton";

interface PrizePosition {
  position: number;
  percentage: number;
}

interface QuinielaDetailsDrawerProps {
  quinielaData: {
    name: string;
    description: string | null;
    league: string | null;
    externalLeagueId: string | null;
    joinCode: string;
    createdAt: Date;
    ownerName: string | null;
    ownerEmail: string | null;
    moneyToEnter?: number | null;
    prizeDistribution?: PrizePosition[] | null;
    moneyPerRoundToEnter?: number | null;
    prizeDistributionPerRound?: PrizePosition[] | null;
    pointsForExactResultPrediction?: number | null;
    pointsForCorrectResultPrediction?: number | null;
  };
  participantCount?: number;
}

export default function QuinielaDetailsDrawer({
  quinielaData,
  participantCount = 0,
}: QuinielaDetailsDrawerProps) {
  // Tournament prizes
  const moneyToEnter = quinielaData.moneyToEnter ?? 0;
  const totalTournamentPrize = moneyToEnter * participantCount;
  const prizeDistribution = quinielaData.prizeDistribution ?? [];

  // Per-round prizes
  const moneyPerRoundToEnter = quinielaData.moneyPerRoundToEnter ?? 0;
  const totalRoundPrize = moneyPerRoundToEnter * participantCount;
  const prizeDistributionPerRound = quinielaData.prizeDistributionPerRound ?? [];

  // Points
  const exactPoints = quinielaData.pointsForExactResultPrediction ?? 2;
  const correctResultPoints = quinielaData.pointsForCorrectResultPrediction ?? 1;

  const hasTournamentPrize = moneyToEnter > 0 && prizeDistribution.length > 0;
  const hasRoundPrize = moneyPerRoundToEnter > 0 && prizeDistributionPerRound.length > 0;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="h-4 w-4" />
          Detalles
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold">
              Detalles de la Quiniela
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Join Code Section - Now at top */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Código de Unión</h3>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <ClickableJoinCode joinCode={quinielaData.joinCode} />
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Haz clic en el código para copiarlo
                </p>
              </div>
            </div>

            {/* Join Link Section - Also at top */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Enlace de Unión</h3>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="mb-3 break-all rounded-md bg-background px-3 py-2 font-mono text-sm">
                  {`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/quinielas/join/${quinielaData.joinCode}`}
                </div>
                <div className="flex justify-center">
                  <CopyJoinLinkButton joinCode={quinielaData.joinCode} />
                </div>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Comparte este enlace para que otros puedan unirse directamente
                </p>
              </div>
            </div>

            {/* Points System - Moved above prizes */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Sistema de Puntos</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-green-500/10 p-3 text-center">
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                    <Target className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-lg font-bold text-green-600">{exactPoints}</p>
                  <p className="text-xs text-muted-foreground">Resultado Exacto</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-lg font-bold text-blue-600">{correctResultPoints}</p>
                  <p className="text-xs text-muted-foreground">Resultado Correcto</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-3 text-center">
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-lg font-bold text-red-600">0</p>
                  <p className="text-xs text-muted-foreground">Incorrecto</p>
                </div>
              </div>
            </div>

            {/* Tournament Prize Section */}
            {hasTournamentPrize && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Premio de Torneo Completo</h3>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  {/* Total Prize */}
                  <div className="mb-4 flex items-center justify-between rounded-lg bg-background p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pozo Total</p>
                        <p className="text-xl font-bold text-green-600">
                          ${totalTournamentPrize.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{participantCount} participante{participantCount !== 1 ? "s" : ""}</p>
                      <p>${moneyToEnter} c/u</p>
                    </div>
                  </div>

                  {/* Prize Distribution */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Distribución de Premios
                    </p>
                    <div className="space-y-2">
                      {prizeDistribution
                        .sort((a, b) => a.position - b.position)
                        .map((prize) => {
                          const prizeAmount = (totalTournamentPrize * prize.percentage) / 100;
                          return (
                            <div
                              key={prize.position}
                              className="flex items-center justify-between rounded-md bg-background px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    prize.position === 1
                                      ? "bg-yellow-500/20 text-yellow-600"
                                      : prize.position === 2
                                        ? "bg-gray-300/30 text-gray-500"
                                        : prize.position === 3
                                          ? "bg-orange-500/20 text-orange-600"
                                          : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {prize.position}°
                                </div>
                                <span className="text-sm">
                                  {prize.position === 1
                                    ? "Primer lugar"
                                    : prize.position === 2
                                      ? "Segundo lugar"
                                      : prize.position === 3
                                        ? "Tercer lugar"
                                        : `${prize.position}° lugar`}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  ${prizeAmount.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {prize.percentage}%
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Per-Round Prize Section */}
            {hasRoundPrize && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-foreground">Premio por Jornada</h3>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  {/* Total Prize per Round */}
                  <div className="mb-4 flex items-center justify-between rounded-lg bg-background p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <DollarSign className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pozo por Jornada</p>
                        <p className="text-xl font-bold text-amber-600">
                          ${totalRoundPrize.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{participantCount} participante{participantCount !== 1 ? "s" : ""}</p>
                      <p>${moneyPerRoundToEnter} c/u</p>
                    </div>
                  </div>

                  {/* Prize Distribution */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Distribución de Premios (cada jornada)
                    </p>
                    <div className="space-y-2">
                      {prizeDistributionPerRound
                        .sort((a, b) => a.position - b.position)
                        .map((prize) => {
                          const prizeAmount = (totalRoundPrize * prize.percentage) / 100;
                          return (
                            <div
                              key={prize.position}
                              className="flex items-center justify-between rounded-md bg-background px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    prize.position === 1
                                      ? "bg-yellow-500/20 text-yellow-600"
                                      : prize.position === 2
                                        ? "bg-gray-300/30 text-gray-500"
                                        : prize.position === 3
                                          ? "bg-orange-500/20 text-orange-600"
                                          : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {prize.position}°
                                </div>
                                <span className="text-sm">
                                  {prize.position === 1
                                    ? "Primer lugar"
                                    : prize.position === 2
                                      ? "Segundo lugar"
                                      : prize.position === 3
                                        ? "Tercer lugar"
                                        : `${prize.position}° lugar`}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  ${prizeAmount.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {prize.percentage}%
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* League and Admin Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Liga</h3>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  {quinielaData.externalLeagueId ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white shadow-sm">
                      <Image
                        src={`https://media.api-sports.io/football/leagues/${quinielaData.externalLeagueId}.png`}
                        alt={quinielaData.league || "Liga"}
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Info className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {quinielaData.league || "No especificada"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Liga de la quiniela
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Admin</h3>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">
                    {quinielaData.ownerName || "Admin"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Administrador de la quiniela
                  </p>
                </div>
              </div>
            </div>

            {/* Description and Creation Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Descripción</h3>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm">
                    {quinielaData.description || "Sin descripción"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Fecha de Creación
                </h3>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">
                    {new Date(quinielaData.createdAt).toLocaleDateString(
                      "es-ES",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(quinielaData.createdAt).toLocaleTimeString(
                      "es-ES",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

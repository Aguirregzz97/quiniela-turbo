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
import { Info, X, Heart, DollarSign, Trophy } from "lucide-react";
import Image from "next/image";
import ClickableJoinCode from "@/components/QuinielaComponents/ClickableJoinCode";
import CopySurvivorJoinLinkButton from "./CopySurvivorJoinLinkButton";

interface PrizePosition {
  position: number;
  percentage: number;
}

interface SurvivorDetailsDrawerProps {
  survivorData: {
    name: string;
    description: string | null;
    league: string | null;
    externalLeagueId: string | null;
    joinCode: string;
    lives: number;
    moneyToEnter: number;
    prizeDistribution?: PrizePosition[] | null;
    createdAt: Date;
    ownerName: string | null;
    ownerEmail: string | null;
  };
  participantCount?: number;
}

export default function SurvivorDetailsDrawer({
  survivorData,
  participantCount = 0,
}: SurvivorDetailsDrawerProps) {
  const totalPrize = survivorData.moneyToEnter * participantCount;
  const prizeDistribution = survivorData.prizeDistribution ?? [];

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
              Detalles del Survivor
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
                <ClickableJoinCode joinCode={survivorData.joinCode} />
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
                  {`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/survivor/join/${survivorData.joinCode}`}
                </div>
                <div className="flex justify-center">
                  <CopySurvivorJoinLinkButton joinCode={survivorData.joinCode} />
                </div>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Comparte este enlace para que otros puedan unirse directamente
                </p>
              </div>
            </div>

            {/* Game Settings */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Vidas</h3>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                    <Heart className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">{survivorData.lives} vida(s)</p>
                    <p className="text-sm text-muted-foreground">
                      Por jugador
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Entrada</h3>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">
                    {survivorData.moneyToEnter > 0
                      ? `$${survivorData.moneyToEnter}`
                      : "Gratis"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Precio de entrada
                  </p>
                </div>
              </div>
            </div>

            {/* Prize Section */}
            {survivorData.moneyToEnter > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Premios</h3>
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
                          ${totalPrize.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{participantCount} participante{participantCount !== 1 ? "s" : ""}</p>
                      <p>${survivorData.moneyToEnter} c/u</p>
                    </div>
                  </div>

                  {/* Prize Distribution */}
                  {prizeDistribution.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Distribución de Premios
                      </p>
                      <div className="space-y-2">
                        {prizeDistribution
                          .sort((a, b) => a.position - b.position)
                          .map((prize) => {
                            const prizeAmount = (totalPrize * prize.percentage) / 100;
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
                  )}
                </div>
              </div>
            )}

            {/* League and Admin Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Liga</h3>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  {survivorData.externalLeagueId ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white shadow-sm">
                      <Image
                        src={`https://media.api-sports.io/football/leagues/${survivorData.externalLeagueId}.png`}
                        alt={survivorData.league || "Liga"}
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
                      {survivorData.league || "No especificada"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Liga del Survivor
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Admin</h3>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">
                    {survivorData.ownerName || "Admin"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Administrador del Survivor
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
                    {survivorData.description || "Sin descripción"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Fecha de Creación
                </h3>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">
                    {new Date(survivorData.createdAt).toLocaleDateString(
                      "es-ES",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(survivorData.createdAt).toLocaleTimeString(
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


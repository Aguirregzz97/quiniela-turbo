"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Trophy, Users, Calendar } from "lucide-react";
import QuinielaLeaderboard from "./QuinielaLeaderboard";
import type { Quiniela } from "@/db/schema";
import type { PrizeDistribution } from "@/lib/prizes";

interface QuinielaResultsTabsProps {
  quiniela: Quiniela;
  exactPoints: number;
  correctResultPoints: number;
  moneyToEnter?: number;
  prizeDistribution?: PrizeDistribution[];
  participantCount: number;
}

type TabValue = "overall" | "per-round";

export default function QuinielaResultsTabs({
  quiniela,
  exactPoints,
  correctResultPoints,
  moneyToEnter,
  prizeDistribution,
  participantCount,
}: QuinielaResultsTabsProps) {
  // Controlled so the "Ver por jornada" teaser below the leaderboard can
  // programmatically switch tabs.
  const [tab, setTab] = useState<TabValue>("overall");

  return (
    <section className="mb-2">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-semibold">Resultados</h2>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
        className="w-full"
      >
        <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="overall" className="gap-2">
            <Trophy className="h-3.5 w-3.5" />
            Torneo completo
          </TabsTrigger>
          {/* Subtle "there's more here" cue: a small primary-colored dot
              that sits next to the label while the tab is inactive, then
              disappears once the user lands on it. Keeps the tab metaphor
              intact (no arrows, no color overrides on the label). */}
          <TabsTrigger value="per-round" className="relative gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Por jornada
            {tab !== "per-round" && (
              <span
                aria-hidden
                className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary"
              />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="mt-0">
          <p className="mb-3 text-sm text-muted-foreground">
            Tabla general acumulada de todas las jornadas.
          </p>
          <QuinielaLeaderboard
            quiniela={quiniela}
            exactPoints={exactPoints}
            correctResultPoints={correctResultPoints}
            moneyToEnter={moneyToEnter}
            prizeDistribution={prizeDistribution}
            participantCount={participantCount}
          />
        </TabsContent>

        <TabsContent value="per-round" className="mt-0">
          <p className="mb-3 text-sm text-muted-foreground">
            Resultados de cada jornada por separado. Elige cómo quieres verlos.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href={`/quinielas/${quiniela.id}/resultados-por-usuario`}
              className="group"
            >
              <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
                <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold transition-colors group-hover:text-primary">
                      Por usuario
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Cómo le fue a cada participante en cada jornada.
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                </CardContent>
              </Card>
            </Link>

            <Link
              href={`/quinielas/${quiniela.id}/resultados-por-partido`}
              className="group"
            >
              <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
                <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
                    <Trophy className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold transition-colors group-hover:text-primary">
                      Por partido
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Qué predijo cada participante en cada partido.
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

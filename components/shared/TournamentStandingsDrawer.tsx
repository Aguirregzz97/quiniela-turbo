"use client";

import { useMemo } from "react";
import { FixtureData } from "@/types/fixtures";
import { computeStandings } from "@/lib/tournament";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import Image from "next/image";

interface TournamentStandingsDrawerProps {
  tournamentFixtures: FixtureData[];
  isLoading?: boolean;
}

function ResultDot({
  result,
}: {
  result: "win" | "draw" | "loss" | null;
}) {
  return (
    <div
      className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${
        result === "win"
          ? "bg-emerald-500 text-white"
          : result === "loss"
            ? "bg-red-500 text-white"
            : result === "draw"
              ? "bg-amber-500 text-white"
              : "bg-muted/50 text-muted-foreground"
      }`}
    >
      {result === "win" ? "✓" : result === "loss" ? "✗" : "−"}
    </div>
  );
}

export function TournamentStandingsDrawer({
  tournamentFixtures,
  isLoading,
}: TournamentStandingsDrawerProps) {
  const standings = useMemo(
    () => computeStandings(tournamentFixtures),
    [tournamentFixtures],
  );

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 border-amber-500/30 bg-amber-500/5 text-xs hover:bg-amber-500/10"
        >
          <Trophy className="h-3.5 w-3.5 text-amber-600" />
          <span className="hidden sm:inline">Posiciones</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="data-[vaul-drawer-direction=right]:w-[92%] data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader className="border-b border-border/50 px-4">
          <DrawerTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-500/25">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg">Posiciones</span>
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : standings.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <Trophy className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No hay datos de partidos disponibles
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="w-7 py-2.5 pl-3 pr-1 text-center font-medium">
                      #
                    </th>
                    <th className="py-2.5 pl-1 pr-2 text-left font-medium">
                      Club
                    </th>
                    <th className="w-8 py-2.5 text-center font-medium">PJ</th>
                    <th className="w-8 py-2.5 text-center font-medium">G</th>
                    <th className="w-8 py-2.5 text-center font-medium">E</th>
                    <th className="w-8 py-2.5 text-center font-medium">P</th>
                    <th className="w-9 py-2.5 text-center font-medium">Pts</th>
                    <th className="py-2.5 pr-3 text-center font-medium">
                      Últimos 5
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, index) => (
                    <tr
                      key={team.teamId}
                      className="border-b border-border/20 transition-colors last:border-0 hover:bg-muted/20"
                    >
                      <td className="py-2.5 pl-3 pr-1 text-center text-xs font-semibold text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="py-2.5 pl-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-white shadow-sm ring-1 ring-black/5 sm:h-6 sm:w-6 sm:rounded-md">
                            <Image
                              src={team.teamLogo}
                              alt={team.teamName}
                              width={18}
                              height={18}
                              className="h-4 w-4 object-contain sm:h-[18px] sm:w-[18px]"
                            />
                          </div>
                          <span className="hidden max-w-[90px] truncate text-xs font-medium sm:inline">
                            {team.teamName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-xs tabular-nums">
                        {team.played}
                      </td>
                      <td className="py-2.5 text-center text-xs tabular-nums">
                        {team.wins}
                      </td>
                      <td className="py-2.5 text-center text-xs tabular-nums">
                        {team.draws}
                      </td>
                      <td className="py-2.5 text-center text-xs tabular-nums">
                        {team.losses}
                      </td>
                      <td className="py-2.5 text-center text-xs font-bold tabular-nums text-primary">
                        {team.points}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center justify-center gap-0.5">
                          {team.last5.map((result, i) => (
                            <ResultDot key={i} result={result} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

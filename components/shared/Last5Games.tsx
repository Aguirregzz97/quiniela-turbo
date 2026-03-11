"use client";

import { FixtureData } from "@/types/fixtures";
import { getTeamLastResults } from "@/lib/tournament";
import { Skeleton } from "@/components/ui/skeleton";

interface Last5GamesProps {
  teamId: number;
  tournamentFixtures: FixtureData[];
  isLoading?: boolean;
}

export function Last5Games({
  teamId,
  tournamentFixtures,
  isLoading,
}: Last5GamesProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-5 w-5 rounded-full" />
        ))}
      </div>
    );
  }

  const results = getTeamLastResults(tournamentFixtures, teamId);

  if (results.every((r) => r === null)) {
    return (
      <div className="flex items-center justify-center gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/50"
          >
            <span className="text-[10px] text-muted-foreground">−</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {results.map((result, i) => (
        <div
          key={i}
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
            result === "win"
              ? "bg-emerald-500 text-white"
              : result === "loss"
                ? "bg-red-500 text-white"
                : result === "draw"
                  ? "bg-amber-500 text-white"
                  : "bg-muted/50 text-muted-foreground"
          }`}
        >
          {result === "win"
            ? "✓"
            : result === "loss"
              ? "✗"
              : result === "draw"
                ? "−"
                : "−"}
        </div>
      ))}
    </div>
  );
}

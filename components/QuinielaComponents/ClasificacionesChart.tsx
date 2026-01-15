"use client";

import { useMemo } from "react";
import { useFixtures } from "@/hooks/api-football/useFixtures";
import { useAllPredictions } from "@/hooks/predictions/useAllPredictions";
import { getFixturesParamsFromQuiniela } from "@/utils/quinielaHelpers";
import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Users, Loader2 } from "lucide-react";
import { Quiniela } from "@/db/schema";
import { FixtureData } from "@/types/fixtures";
import { AllPredictionsData } from "@/hooks/predictions/useAllPredictions";

interface ClasificacionesChartProps {
  quiniela: Quiniela;
  exactPoints?: number;
  correctResultPoints?: number;
}

interface UserStats {
  id: string;
  name: string;
  totalPoints: number;
  fill: string;
}

// Color palette based on primary color (hue ~240 blue)
// Generates shades by rotating hue slightly and varying lightness/chroma
// This creates a cohesive palette that works well together
const generatePrimaryPalette = (): string[] => {
  const baseHue = 240; // Primary blue hue
  const colors: string[] = [];

  // Core primary shades (darkest to lightest)
  colors.push(`oklch(0.45 0.16 ${baseHue})`); // Very dark primary
  colors.push(`oklch(0.52 0.15 ${baseHue})`); // Dark primary
  colors.push(`oklch(0.59 0.14 ${baseHue})`); // Primary (matches --primary)
  colors.push(`oklch(0.68 0.15 ${baseHue})`); // Light primary
  colors.push(`oklch(0.75 0.14 ${baseHue})`); // Lighter primary
  colors.push(`oklch(0.82 0.12 ${baseHue})`); // Very light primary

  // Analogous colors (slight hue shifts for variety while staying cohesive)
  colors.push(`oklch(0.55 0.14 ${baseHue - 20})`); // Blue-violet
  colors.push(`oklch(0.62 0.15 ${baseHue - 20})`);
  colors.push(`oklch(0.70 0.13 ${baseHue - 20})`);

  colors.push(`oklch(0.55 0.14 ${baseHue + 20})`); // Blue-cyan
  colors.push(`oklch(0.62 0.15 ${baseHue + 20})`);
  colors.push(`oklch(0.70 0.13 ${baseHue + 20})`);

  // More hue variations for large participant counts
  colors.push(`oklch(0.50 0.13 ${baseHue - 35})`); // Violet
  colors.push(`oklch(0.58 0.14 ${baseHue - 35})`);
  colors.push(`oklch(0.66 0.12 ${baseHue - 35})`);

  colors.push(`oklch(0.50 0.13 ${baseHue + 35})`); // Cyan
  colors.push(`oklch(0.58 0.14 ${baseHue + 35})`);
  colors.push(`oklch(0.66 0.12 ${baseHue + 35})`);

  // Extended palette for even more participants
  colors.push(`oklch(0.48 0.12 ${baseHue - 50})`); // Purple
  colors.push(`oklch(0.56 0.13 ${baseHue - 50})`);
  colors.push(`oklch(0.64 0.11 ${baseHue - 50})`);

  colors.push(`oklch(0.48 0.12 ${baseHue + 50})`); // Teal
  colors.push(`oklch(0.56 0.13 ${baseHue + 50})`);
  colors.push(`oklch(0.64 0.11 ${baseHue + 50})`);

  // Additional shades with different chroma levels
  colors.push(`oklch(0.53 0.18 ${baseHue})`); // High chroma primary
  colors.push(`oklch(0.60 0.10 ${baseHue})`); // Low chroma primary
  colors.push(`oklch(0.53 0.18 ${baseHue - 25})`);
  colors.push(`oklch(0.60 0.10 ${baseHue + 25})`);

  // More variations for very large groups
  colors.push(`oklch(0.47 0.15 ${baseHue - 15})`);
  colors.push(`oklch(0.55 0.16 ${baseHue + 15})`);
  colors.push(`oklch(0.63 0.14 ${baseHue - 30})`);
  colors.push(`oklch(0.71 0.12 ${baseHue + 30})`);

  return colors;
};

const CHART_COLORS = generatePrimaryPalette();

const getChartColors = (count: number): string[] => {
  if (count <= CHART_COLORS.length) {
    return CHART_COLORS.slice(0, count);
  }

  // If we need even more colors, cycle through with slight opacity variations
  const colors: string[] = [...CHART_COLORS];
  let cycle = 1;
  while (colors.length < count) {
    // Add more by adjusting lightness slightly on each cycle
    const lightnessAdjust = cycle * 0.03;
    for (const baseColor of CHART_COLORS) {
      if (colors.length >= count) break;
      // Parse and adjust the oklch color
      const match = baseColor.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/);
      if (match) {
        const l = Math.min(
          0.85,
          Math.max(0.35, parseFloat(match[1]) + lightnessAdjust),
        );
        colors.push(`oklch(${l.toFixed(2)} ${match[2]} ${match[3]})`);
      }
    }
    cycle++;
  }

  return colors.slice(0, count);
};

// Helper function to evaluate prediction accuracy
function evaluatePrediction(
  prediction: {
    predictedHomeScore: number | null;
    predictedAwayScore: number | null;
  },
  actualResult: { homeScore: number | null; awayScore: number | null },
  matchFinished: boolean,
  exactPoints: number = 2,
  correctResultPoints: number = 1,
): { points: number } {
  if (
    prediction.predictedHomeScore === null ||
    prediction.predictedAwayScore === null
  ) {
    return { points: 0 };
  }

  if (
    !matchFinished ||
    actualResult.homeScore === null ||
    actualResult.awayScore === null
  ) {
    return { points: 0 };
  }

  const predictedHome = prediction.predictedHomeScore;
  const predictedAway = prediction.predictedAwayScore;
  const actualHome = actualResult.homeScore;
  const actualAway = actualResult.awayScore;

  // Exact prediction
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return { points: exactPoints };
  }

  // Correct result (winner)
  const predictedWinner =
    predictedHome > predictedAway
      ? "home"
      : predictedHome < predictedAway
        ? "away"
        : "draw";
  const actualWinner =
    actualHome > actualAway
      ? "home"
      : actualHome < actualAway
        ? "away"
        : "draw";

  if (predictedWinner === actualWinner) {
    return { points: correctResultPoints };
  }

  return { points: 0 };
}

export default function ClasificacionesChart({
  quiniela,
  exactPoints = 2,
  correctResultPoints = 1,
}: ClasificacionesChartProps) {
  const fixturesParams = getFixturesParamsFromQuiniela(quiniela);

  const { data: fixturesData, isLoading: fixturesLoading } = useFixtures(
    fixturesParams.leagueId,
    fixturesParams.season,
    fixturesParams.fromDate,
    fixturesParams.toDate,
  );

  const { data: allPredictions = [], isLoading: predictionsLoading } =
    useAllPredictions(quiniela.id);

  // Calculate user statistics
  const { chartData, chartConfig } = useMemo(() => {
    if (!fixturesData?.response || !allPredictions.length) {
      return { chartData: [], chartConfig: {} as ChartConfig };
    }

    // First pass: collect all users and calculate points
    const userDataMap = new Map<
      string,
      { user: AllPredictionsData; totalPoints: number }
    >();

    // Group predictions by user
    const predictionsByUser = new Map<string, AllPredictionsData[]>();
    allPredictions.forEach((prediction) => {
      if (!predictionsByUser.has(prediction.userId)) {
        predictionsByUser.set(prediction.userId, []);
      }
      predictionsByUser.get(prediction.userId)!.push(prediction);
    });

    // Calculate stats for each user
    predictionsByUser.forEach((userPredictions, userId) => {
      const user = userPredictions[0];
      let totalPoints = 0;

      fixturesData.response.forEach((fixture: FixtureData) => {
        const matchFinished =
          fixture.fixture.status.short === "FT" ||
          fixture.fixture.status.short === "AET" ||
          fixture.fixture.status.short === "PEN";

        if (!matchFinished) return;

        const prediction = userPredictions.find(
          (p) => p.externalFixtureId === fixture.fixture.id.toString(),
        );

        const actualResult = {
          homeScore: fixture.goals.home,
          awayScore: fixture.goals.away,
        };

        const evaluation = evaluatePrediction(
          prediction
            ? {
                predictedHomeScore: prediction.predictedHomeScore,
                predictedAwayScore: prediction.predictedAwayScore,
              }
            : {
                predictedHomeScore: null,
                predictedAwayScore: null,
              },
          actualResult,
          matchFinished,
          exactPoints,
          correctResultPoints,
        );

        totalPoints += evaluation.points;
      });

      userDataMap.set(userId, { user, totalPoints });
    });

    // Sort by total points descending and get colors
    const sortedEntries = Array.from(userDataMap.entries()).sort(
      (a, b) => b[1].totalPoints - a[1].totalPoints,
    );

    const colors = getChartColors(sortedEntries.length);

    // Build final chart data with colors assigned by position
    const sortedUsers: UserStats[] = sortedEntries.map(
      ([userId, data], index) => {
        const displayName =
          data.user.userName || data.user.userEmail?.split("@")[0] || "Usuario";
        // Truncate name for display
        const shortName =
          displayName.length > 12
            ? displayName.substring(0, 12) + "…"
            : displayName;

        return {
          id: userId,
          name: shortName,
          totalPoints: data.totalPoints,
          fill: colors[index],
        };
      },
    );

    // Build chart config
    const config: ChartConfig = {};
    sortedUsers.forEach((user) => {
      config[user.id] = {
        label: user.name,
        color: user.fill,
      };
    });

    return { chartData: sortedUsers, chartConfig: config };
  }, [
    fixturesData?.response,
    allPredictions,
    exactPoints,
    correctResultPoints,
  ]);

  if (fixturesLoading || predictionsLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center sm:h-[280px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Cargando clasificación...
          </p>
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center text-center sm:h-[280px]">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
          <Users className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No hay datos suficientes para mostrar la clasificación
        </p>
      </div>
    );
  }

  // Calculate dynamic height based on number of users
  // Mobile: slightly smaller bars, Desktop: larger bars
  const mobileBarHeight = 40;
  const desktopBarHeight = 44;
  const mobileChartHeight = Math.max(
    180,
    chartData.length * mobileBarHeight + 20,
  );
  const desktopChartHeight = Math.max(
    200,
    chartData.length * desktopBarHeight + 40,
  );

  return (
    <div className="w-full">
      {/* Desktop Chart - Horizontal Bars */}
      <div className="hidden sm:block">
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: `${desktopChartHeight}px` }}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={100}
              tick={{ fontSize: 13, fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: item.payload.fill }}
                      />
                      <span className="font-medium">{item.payload.name}</span>
                      <span className="ml-auto font-mono font-bold tabular-nums">
                        {value} pts
                      </span>
                    </div>
                  )}
                  hideLabel
                />
              }
            />
            <Bar dataKey="totalPoints" radius={[0, 6, 6, 0]} barSize={32}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="totalPoints"
                position="right"
                className="fill-foreground font-mono text-sm font-bold"
                formatter={(value: number) => `${value} pts`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      {/* Mobile Chart - Horizontal Bars (scrollable for many participants) */}
      <div className="block sm:hidden">
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: `${mobileChartHeight}px` }}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 50, bottom: 0, left: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={80}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: item.payload.fill }}
                      />
                      <span className="font-medium">{item.payload.name}</span>
                      <span className="ml-auto font-mono font-bold tabular-nums">
                        {value} pts
                      </span>
                    </div>
                  )}
                  hideLabel
                />
              }
            />
            <Bar dataKey="totalPoints" radius={[0, 4, 4, 0]} barSize={26}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="totalPoints"
                position="right"
                className="fill-foreground font-mono text-xs font-bold"
                formatter={(value: number) => `${value}`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      {/* Legend for top 3 */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-border/50 pt-4 sm:gap-3">
        {chartData.slice(0, 3).map((user, index) => (
          <div
            key={user.id}
            className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 sm:gap-2 sm:px-3 sm:py-1.5"
          >
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground sm:h-5 sm:w-5 sm:text-xs"
              style={{ backgroundColor: user.fill }}
            >
              {index + 1}
            </span>
            <span className="text-[10px] font-medium sm:text-xs">
              {user.name}
            </span>
            <span className="font-mono text-[10px] font-bold text-muted-foreground sm:text-xs">
              {user.totalPoints}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

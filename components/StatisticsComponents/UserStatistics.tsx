"use client";

import { useUserStatistics } from "@/hooks/statistics/useUserStatistics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import {
  Target,
  TrendingUp,
  Trophy,
  BarChart3,
  PieChartIcon,
  Hash,
  Home,
  Plane,
  Minus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Accuracy Donut Chart Component
function AccuracyDonutChart({
  exact,
  correctResult,
  miss,
  noPrediction,
}: {
  exact: number;
  correctResult: number;
  miss: number;
  noPrediction: number;
}) {
  const data = [
    { name: "Exactos", value: exact, fill: "hsl(142, 76%, 36%)" },
    { name: "Resultado", value: correctResult, fill: "hsl(142, 69%, 58%)" },
    { name: "Incorrectos", value: miss, fill: "hsl(0, 84%, 60%)" },
    { name: "Sin pronóstico", value: noPrediction, fill: "hsl(240, 5%, 64%)" },
  ].filter((d) => d.value > 0);

  const total = exact + correctResult + miss + noPrediction;

  if (total === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        Sin datos disponibles
      </div>
    );
  }

  const chartConfig: ChartConfig = {
    exact: { label: "Exactos", color: "hsl(142, 76%, 36%)" },
    correctResult: { label: "Resultado", color: "hsl(142, 69%, 58%)" },
    miss: { label: "Incorrectos", color: "hsl(0, 84%, 60%)" },
    noPrediction: { label: "Sin pronóstico", color: "hsl(240, 5%, 64%)" },
  };

  return (
    <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <span>
                  {name}: {value} ({((Number(value) / total) * 100).toFixed(1)}
                  %)
                </span>
              )}
            />
          }
        />
      </PieChart>
    </ChartContainer>
  );
}

// Prediction Patterns Bar Chart
function PredictionPatternsChart({
  homeWinRate,
  drawRate,
  awayWinRate,
}: {
  homeWinRate: number;
  drawRate: number;
  awayWinRate: number;
}) {
  const data = [
    { name: "Local", value: homeWinRate, fill: "hsl(221, 83%, 53%)" },
    { name: "Empate", value: drawRate, fill: "hsl(45, 93%, 47%)" },
    { name: "Visitante", value: awayWinRate, fill: "hsl(0, 84%, 60%)" },
  ];

  const chartConfig: ChartConfig = {
    home: { label: "Local", color: "hsl(221, 83%, 53%)" },
    draw: { label: "Empate", color: "hsl(45, 93%, 47%)" },
    away: { label: "Visitante", color: "hsl(0, 84%, 60%)" },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[180px] w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
      >
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          width={60}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `${Number(value).toFixed(1)}%`}
            />
          }
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: "primary" | "success" | "warning" | "destructive";
}) {
  const colorClasses = {
    primary: "from-primary/20 to-primary/10 text-primary",
    success: "from-green-500/20 to-green-500/10 text-green-600",
    warning: "from-yellow-500/20 to-yellow-500/10 text-yellow-600",
    destructive: "from-red-500/20 to-red-500/10 text-red-600",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-gradient-to-br p-4">
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colorClasses[color]}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Percentage Ring Component
function PercentageRing({
  percentage,
  label,
  color,
  size = "md",
}: {
  percentage: number;
  label: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-2xl",
  };

  const radius = size === "sm" ? 25 : size === "md" ? 40 : 55;
  const strokeWidth = size === "sm" ? 4 : size === "md" ? 6 : 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${sizeClasses[size]}`}>
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold tabular-nums ${textSizes[size]}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="text-center text-xs font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// Most Predicted Scores Component
function MostPredictedScores({
  scores,
}: {
  scores: { score: string; count: number }[];
}) {
  if (scores.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sin datos
      </div>
    );
  }

  const maxCount = Math.max(...scores.map((s) => s.count));

  return (
    <div className="space-y-3">
      {scores.map((item, index) => (
        <div key={item.score} className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
              index === 0
                ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900"
                : index === 1
                  ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700"
                  : index === 2
                    ? "bg-gradient-to-br from-amber-500 to-amber-600 text-amber-100"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            #{index + 1}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono font-bold">{item.score}</span>
              <span className="text-xs text-muted-foreground">
                {item.count} veces
              </span>
            </div>
            <Progress value={(item.count / maxCount) * 100} className="h-1.5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserStatistics() {
  const { data: stats, isLoading, error } = useUserStatistics();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          Cargando estadísticas...
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="mt-3 text-sm text-destructive">
          Error al cargar las estadísticas
        </p>
      </div>
    );
  }

  if (stats.quinielasCount === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Sin estadísticas aún</h2>
          <p className="max-w-md text-muted-foreground">
            Únete a una quiniela y comienza a hacer pronósticos para ver tus
            estadísticas aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Overall Accuracy Metrics */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Métricas de Precisión</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Distribución de Pronósticos
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
                <div className="w-full max-w-[200px] flex-shrink-0">
                  <AccuracyDonutChart
                    exact={stats.exactPredictions}
                    correctResult={stats.correctResultPredictions}
                    miss={stats.missPredictions}
                    noPrediction={stats.noPredictions}
                  />
                </div>
                <div className="grid flex-shrink-0 grid-cols-2 gap-3 text-center sm:grid-cols-1 sm:text-left">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: "hsl(142, 76%, 36%)" }}
                    />
                    <span className="text-xs">
                      Exactos: {stats.exactPredictions}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: "hsl(142, 69%, 58%)" }}
                    />
                    <span className="text-xs">
                      Resultado: {stats.correctResultPredictions}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: "hsl(0, 84%, 60%)" }}
                    />
                    <span className="text-xs">
                      Incorrectos: {stats.missPredictions}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: "hsl(240, 5%, 64%)" }}
                    />
                    <span className="text-xs">
                      Sin pronóstico: {stats.noPredictions}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasas de Acierto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-around py-2">
                <PercentageRing
                  percentage={stats.exactRate}
                  label="Exactos"
                  color="hsl(142, 76%, 36%)"
                />
                <PercentageRing
                  percentage={stats.correctResultRate}
                  label="Resultado"
                  color="hsl(142, 69%, 58%)"
                />
                <PercentageRing
                  percentage={stats.totalAccuracyRate}
                  label="Total"
                  color="var(--primary)"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 2: Points Statistics */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Estadísticas de Puntos</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Puntos Totales"
            value={stats.totalPoints}
            subtitle={`En ${stats.quinielasCount} quiniela${stats.quinielasCount !== 1 ? "s" : ""}`}
            icon={Trophy}
            color="primary"
          />
          <StatCard
            title="Promedio por Partido"
            value={stats.averagePointsPerMatch.toFixed(2)}
            subtitle={`De ${stats.finishedMatchesCount} partidos`}
            icon={TrendingUp}
            color="success"
          />
          <StatCard
            title="Partidos Evaluados"
            value={stats.finishedMatchesCount}
            subtitle="Partidos terminados"
            icon={BarChart3}
            color="primary"
          />
        </div>
      </section>

      {/* Section 3: Prediction Patterns */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Patrones de Pronóstico</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resultados Predichos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PredictionPatternsChart
                homeWinRate={stats.homeWinPredictionRate}
                drawRate={stats.drawPredictionRate}
                awayWinRate={stats.awayWinPredictionRate}
              />
              <div className="mt-3 flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5 text-blue-500" />
                  <span>Local</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Minus className="h-3.5 w-3.5 text-yellow-500" />
                  <span>Empate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Plane className="h-3.5 w-3.5 text-red-500" />
                  <span>Visitante</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Marcadores Más Predichos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MostPredictedScores scores={stats.mostPredictedScores} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Estadísticas de Goles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Promedio de goles predichos</span>
                </div>
                <span className="text-xl font-bold tabular-nums">
                  {stats.averageGoalsPredicted.toFixed(1)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <p className="text-lg font-bold text-blue-600">
                    {stats.homeWinPredictionRate.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Victoria Local
                  </p>
                </div>
                <div className="rounded-lg bg-yellow-500/10 p-2">
                  <p className="text-lg font-bold text-yellow-600">
                    {stats.drawPredictionRate.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Empates</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-2">
                  <p className="text-lg font-bold text-red-600">
                    {stats.awayWinPredictionRate.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Victoria Visitante
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

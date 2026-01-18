"use client";

import { useSurvivorStatistics } from "@/hooks/statistics/useSurvivorStatistics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Swords,
  Trophy,
  Skull,
  Target,
  Loader2,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
} from "lucide-react";

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
  color?: "primary" | "success" | "warning" | "destructive" | "rose";
}) {
  const colorClasses = {
    primary: "from-primary/20 to-primary/10 text-primary",
    success: "from-green-500/20 to-green-500/10 text-green-600",
    warning: "from-yellow-500/20 to-yellow-500/10 text-yellow-600",
    destructive: "from-red-500/20 to-red-500/10 text-red-600",
    rose: "from-rose-500/20 to-rose-500/10 text-rose-600",
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

// Pick Results Distribution
function PickResultsDistribution({
  wins,
  draws,
  losses,
  missed,
}: {
  wins: number;
  draws: number;
  losses: number;
  missed: number;
}) {
  const total = wins + draws + losses + missed;

  if (total === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        Sin datos disponibles
      </div>
    );
  }

  const data = [
    {
      label: "Victorias",
      value: wins,
      percentage: (wins / total) * 100,
      color: "bg-green-500",
      icon: CheckCircle2,
    },
    {
      label: "Empates",
      value: draws,
      percentage: (draws / total) * 100,
      color: "bg-yellow-500",
      icon: MinusCircle,
    },
    {
      label: "Derrotas",
      value: losses,
      percentage: (losses / total) * 100,
      color: "bg-red-500",
      icon: XCircle,
    },
    {
      label: "Sin pick",
      value: missed,
      percentage: (missed / total) * 100,
      color: "bg-gray-400",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <item.icon
            className={`h-4 w-4 flex-shrink-0 ${
              item.label === "Victorias"
                ? "text-green-500"
                : item.label === "Empates"
                  ? "text-yellow-500"
                  : item.label === "Derrotas"
                    ? "text-red-500"
                    : "text-gray-400"
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>{item.label}</span>
              <span className="font-medium">
                {item.value} ({item.percentage.toFixed(0)}%)
              </span>
            </div>
            <Progress value={item.percentage} className={`h-2`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Most Picked Teams Component
function MostPickedTeams({
  teams,
}: {
  teams: { teamName: string; count: number }[];
}) {
  if (teams.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Sin datos
      </div>
    );
  }

  const maxCount = Math.max(...teams.map((t) => t.count));

  return (
    <div className="space-y-3">
      {teams.map((team, index) => (
        <div key={team.teamName} className="flex items-center gap-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
              index === 0
                ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900"
                : index === 1
                  ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700"
                  : index === 2
                    ? "bg-gradient-to-br from-amber-500 to-amber-600 text-amber-100"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="truncate text-sm font-medium">
                {team.teamName}
              </span>
              <span className="text-xs text-muted-foreground">
                {team.count}x
              </span>
            </div>
            <Progress value={(team.count / maxCount) * 100} className="h-1.5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SurvivorStatistics() {
  const { data: stats, isLoading, error } = useSurvivorStatistics();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
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

  if (stats.totalGames === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
            <Swords className="h-8 w-8 text-rose-500" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Sin estadísticas aún</h2>
          <p className="max-w-md text-muted-foreground">
            Únete a un juego de Survivor y comienza a hacer picks para ver tus
            estadísticas aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Overview Stats */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-rose-500" />
          <h3 className="text-lg font-semibold">Resumen General</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Juegos Totales"
            value={stats.totalGames}
            subtitle={`${stats.gamesActive} activo${stats.gamesActive !== 1 ? "s" : ""}`}
            icon={Swords}
            color="rose"
          />
          <StatCard
            title="Juegos Ganados"
            value={stats.gamesWon}
            subtitle={`${stats.winRate.toFixed(0)}% win rate`}
            icon={Trophy}
            color="success"
          />
          <StatCard
            title="Eliminaciones"
            value={stats.gamesLost}
            icon={Skull}
            color="destructive"
          />
          <StatCard
            title="Tasa de Éxito"
            value={`${stats.pickSuccessRate.toFixed(0)}%`}
            subtitle="Picks exitosos"
            icon={TrendingUp}
            color="primary"
          />
        </div>
      </section>

      {/* Section 2: Pick Statistics */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-rose-500" />
          <h3 className="text-lg font-semibold">Estadísticas de Picks</h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Distribución de Resultados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PickResultsDistribution
                wins={stats.winPicks}
                draws={stats.drawPicks}
                losses={stats.lossPicks}
                missed={stats.missedPicks}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Equipos Más Elegidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MostPickedTeams teams={stats.mostPickedTeams} />
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
  );
}


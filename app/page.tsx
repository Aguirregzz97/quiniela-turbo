import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Award,
  Swords,
  BarChart3,
  TrendingUp,
  ChevronRight,
  Target,
  Skull,
  Trophy,
  Zap,
} from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/");
  }

  const games = [
    {
      href: "/quinielas",
      icon: Award,
      title: "Quinielas",
      subtitle: "Predicción de resultados",
      description:
        "Predice los marcadores exactos de cada partido. Gana puntos por acertar el resultado (local/empate/visitante) y puntos extra por el marcador exacto.",
      features: [
        { icon: Target, text: "Predice marcadores" },
        { icon: Trophy, text: "Acumula puntos" },
        { icon: Zap, text: "Compite por jornada" },
      ],
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-500/10 via-orange-500/5 to-transparent",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    },
    {
      href: "/survivor",
      icon: Swords,
      title: "Survivor",
      subtitle: "Último en pie",
      description:
        "Elige un equipo diferente cada jornada. Si tu equipo pierde, pierdes una vida. El último jugador con vidas gana. No puedes repetir equipos.",
      features: [
        { icon: Swords, text: "Elige un equipo" },
        { icon: Skull, text: "Pierde = vida menos" },
        { icon: Trophy, text: "Sobrevive hasta el final" },
      ],
      gradient: "from-rose-500 to-red-600",
      bgGradient: "from-rose-500/10 via-red-500/5 to-transparent",
      iconBg: "bg-gradient-to-br from-rose-500 to-red-600",
    },
  ];

  const stats = [
    {
      href: "/puntuaciones",
      icon: BarChart3,
      title: "Puntuaciones",
      description:
        "Consulta las clasificaciones y posiciones de todos los participantes en tus quinielas.",
      gradient: "from-blue-500 to-cyan-600",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600",
    },
    {
      href: "/estadisticas",
      icon: TrendingUp,
      title: "Estadísticas",
      description:
        "Analiza tu rendimiento histórico, tendencias de aciertos y comparativas con otros jugadores.",
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary-rgb,59,130,246),0.08),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(var(--primary-rgb,59,130,246),0.05),transparent_50%)]" />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Trophy className="h-4 w-4" />
              Liga MX & Más
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              ¡Bienvenido,{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {session.user.name?.split(" ")[0] || "Jugador"}
              </span>
              !
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              Compite con tus amigos prediciendo resultados de fútbol. Elige tu
              modo de juego favorito y demuestra quién sabe más.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Games Section */}
        <div className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Modos de Juego
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {games.map((game) => (
              <Link key={game.href} href={game.href} className="group">
                <div
                  className={`relative h-full overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${game.bgGradient} p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 sm:p-8`}
                >
                  {/* Decorative gradient orb */}
                  <div
                    className={`absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${game.gradient} opacity-10 blur-3xl transition-all duration-500 group-hover:opacity-20`}
                  />

                  <div className="relative">
                    {/* Header */}
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-xl ${game.iconBg} shadow-lg`}
                      >
                        <game.icon className="h-7 w-7 text-white" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </div>

                    {/* Title */}
                    <h3 className="mb-1 text-xl font-bold tracking-tight transition-colors group-hover:text-primary sm:text-2xl">
                      {game.title}
                    </h3>
                    <p
                      className={`mb-3 text-sm font-medium bg-gradient-to-r ${game.gradient} bg-clip-text text-transparent`}
                    >
                      {game.subtitle}
                    </p>

                    {/* Description */}
                    <p className="mb-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {game.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2">
                      {game.features.map((feature, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground/80 ring-1 ring-border/50 backdrop-blur-sm"
                        >
                          <feature.icon className="h-3.5 w-3.5" />
                          {feature.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Análisis y Resultados
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map((stat) => (
              <Link key={stat.href} href={stat.href} className="group">
                <div className="relative h-full overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg sm:p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${stat.iconBg} shadow-md`}
                    >
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="font-semibold transition-colors group-hover:text-primary">
                          {stat.title}
                        </h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {stat.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

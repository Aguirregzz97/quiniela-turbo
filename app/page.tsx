import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Award,
  BarChart3,
  TrendingUp,
  ChevronRight,
  Target,
  Trophy,
  Zap,
  ArrowRight,
} from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/");
  }

  const firstName = session.user.name?.split(" ")[0] || "Jugador";

  const quinielaFeatures = [
    { icon: Target, text: "Predice marcadores" },
    { icon: Trophy, text: "Acumula puntos" },
    { icon: Zap, text: "Compite por jornada" },
  ];

  const explore = [
    {
      href: "/puntuaciones",
      icon: BarChart3,
      title: "Puntuaciones",
      description:
        "Consulta las clasificaciones y posiciones de todos los participantes en tus quinielas.",
      iconBg: "bg-gradient-to-br from-info to-info/85",
    },
    {
      href: "/estadisticas",
      icon: TrendingUp,
      title: "Estadísticas",
      description:
        "Analiza tu rendimiento histórico, tendencias de aciertos y comparativas con otros jugadores.",
      iconBg: "bg-gradient-to-br from-success to-success/85",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Soft decorative glows */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-8 h-64 w-64 rounded-full bg-primary/10 opacity-40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-[1.75rem] bg-primary/30 blur-2xl" />
              <Image
                src="/img/logo_test.png"
                alt="Quiniela Turbo"
                width={112}
                height={112}
                priority
                className="relative h-24 w-24 rounded-[1.75rem] shadow-xl ring-1 ring-border/60 sm:h-28 sm:w-28"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Quiniela{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Turbo
              </span>
            </h1>
            <p className="mt-3 text-lg font-medium text-foreground/80">
              ¡Hola de nuevo, {firstName}!
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Compite con tus amigos prediciendo resultados de fútbol. Arma tu
              quiniela, suma puntos y demuestra quién sabe más.
            </p>

            <Link
              href="/quinielas"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
            >
              Ver mis quinielas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Featured game mode: Quinielas */}
        <Link href="/quinielas" className="group block">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 sm:p-8">
            {/* Decorative gradient orb */}
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-primary to-primary/70 opacity-10 blur-3xl transition-all duration-500 group-hover:opacity-20" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                    <Award className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                      Quinielas
                    </h2>
                    <p className="text-sm font-medium text-primary">
                      Predicción de resultados
                    </p>
                  </div>
                </div>

                <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Predice los marcadores exactos de cada partido. Gana puntos
                  por acertar el resultado (local/empate/visitante) y puntos
                  extra por el marcador exacto.
                </p>

                <div className="flex flex-wrap gap-2">
                  {quinielaFeatures.map((feature, i) => (
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

              <div className="flex sm:justify-end">
                <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-transform group-hover:translate-x-0.5">
                  Jugar
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Explore Section */}
        <div className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Análisis y Resultados
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {explore.map((item) => (
              <Link key={item.href} href={item.href} className="group">
                <div className="relative h-full overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg sm:p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${item.iconBg} shadow-md`}
                    >
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="font-semibold transition-colors group-hover:text-primary">
                          {item.title}
                        </h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.description}
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

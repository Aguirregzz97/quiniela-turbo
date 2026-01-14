import { TrendingUp, Clock } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default async function EstadisticasPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/estadisticas");
  }

  return (
    <div className="max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <TrendingUp className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Estadísticas
          </h1>
          <p className="text-sm text-muted-foreground">
            Analiza tu rendimiento en las quinielas
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Próximamente</h2>
          <p className="max-w-md text-muted-foreground">
            Estamos trabajando en esta funcionalidad. Pronto podrás ver
            estadísticas detalladas de tu rendimiento, incluyendo porcentaje de
            aciertos, rachas y comparativas con otros participantes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

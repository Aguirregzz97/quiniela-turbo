import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function EstadisticasPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/estadisticas");
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <TrendingUp className="h-8 w-8 text-primary" />
          Estadísticas
        </h1>
        <p className="mt-2 text-muted-foreground">
          Analiza el rendimiento y las estadísticas de tus quinielas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quinielas Ganadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">12</div>
            <p className="text-sm text-muted-foreground">
              Quinielas ganadas este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">45</div>
            <p className="text-sm text-muted-foreground">
              Total de participaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Porcentaje de Éxito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">67%</div>
            <p className="text-sm text-muted-foreground">
              Quinielas ganadas vs participadas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Historial de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Aquí podrás ver gráficos y análisis detallados de tu rendimiento
              en quinielas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

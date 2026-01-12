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
      </div>

      <p className="text-lg text-muted-foreground">Próximamente...</p>
    </div>
  );
}

import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Trophy, Clock } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { quinielas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";

interface ResultadosPorPartidoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ResultadosPorPartidoPage({
  params,
}: ResultadosPorPartidoPageProps) {
  const { id } = await params;

  const session = await auth();

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/quinielas/${id}/resultados-por-partido`);
  }

  // Fetch quiniela data
  const quinielaData = await db
    .select()
    .from(quinielas)
    .where(eq(quinielas.id, id))
    .limit(1);

  if (!quinielaData.length) {
    notFound();
  }

  const quiniela = quinielaData[0];

  return (
    <div className="max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Back Button */}
      <Link
        href={`/quinielas/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Quiniela
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <Trophy className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Resultados Por Partido
          </h1>
          <p className="text-sm text-muted-foreground">{quiniela.name}</p>
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
            Estamos trabajando en esta funcionalidad. Pronto podrás ver los
            resultados organizados por partido, incluyendo todos los pronósticos
            de los participantes para cada encuentro.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { quinielas, quiniela_settings, quiniela_participants } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import ResultadosPorUsuario from "@/components/QuinielaComponents/ResultadosPorUsuario";

interface ResultadosPorUsuarioPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ResultadosPorUsuarioPage({
  params,
}: ResultadosPorUsuarioPageProps) {
  const { id } = await params;

  const session = await auth();

  if (!session) {
    redirect(
      `/api/auth/signin?callbackUrl=/quinielas/${id}/resultados-por-usuario`,
    );
  }

  // Fetch quiniela data with settings
  const quinielaData = await db
    .select({
      quiniela: quinielas,
      settings: quiniela_settings,
    })
    .from(quinielas)
    .leftJoin(quiniela_settings, eq(quinielas.id, quiniela_settings.quinielaId))
    .where(eq(quinielas.id, id))
    .limit(1);

  if (!quinielaData.length) {
    notFound();
  }

  const { quiniela, settings } = quinielaData[0];

  // Get participant count
  const participantCountResult = await db
    .select({ count: count() })
    .from(quiniela_participants)
    .where(eq(quiniela_participants.quinielaId, id));

  const participantCount = participantCountResult[0]?.count || 0;

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
          <Users className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Resultados Por Usuario
          </h1>
          <p className="text-sm text-muted-foreground">{quiniela.name}</p>
        </div>
      </div>

      {/* Results by User content */}
      <ResultadosPorUsuario
        quiniela={quiniela}
        userId={session.user.id}
        exactPoints={settings?.pointsForExactResultPrediction ?? 2}
        correctResultPoints={settings?.pointsForCorrectResultPrediction ?? 1}
        moneyPerRoundToEnter={settings?.moneyPerRoundToEnter}
        prizeDistributionPerRound={
          settings?.prizeDistributionPerRound as
            | { position: number; percentage: number }[]
            | null
        }
        participantCount={participantCount}
      />
    </div>
  );
}

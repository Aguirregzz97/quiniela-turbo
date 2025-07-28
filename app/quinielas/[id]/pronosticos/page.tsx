import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { quinielas, quiniela_settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import AllPredictionsTable from "@/components/QuinielaComponents/AllPredictionsTable";

interface PronosticosPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PronosticosPage({
  params,
}: PronosticosPageProps) {
  const { id } = await params;

  const session = await auth();

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/quinielas/${id}/pronosticos`);
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

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Header with back button */}
      <div className="mb-6">
        <div className="mb-4">
          <Button variant="ghost" asChild>
            <Link className="pl-0" href={`/quinielas/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Quiniela
            </Link>
          </Button>
        </div>

        <div className="flex items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl">
            <Eye className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Ver Pronósticos</h1>
            <p className="text-muted-foreground">
              Todos los pronósticos de los participantes
            </p>
          </div>
        </div>
      </div>

      {/* All Predictions content */}
      <AllPredictionsTable
        quiniela={quiniela}
        userId={session.user.id}
        exactPoints={settings?.pointsForExactResultPrediction ?? 2}
        correctResultPoints={settings?.pointsForCorrectResultPrediction ?? 1}
      />
    </div>
  );
}

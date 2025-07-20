import { auth } from "@/auth";
import EditQuinielaForm from "@/components/QuinielaComponents/EditQuinielaForm";
import { db } from "@/db";
import { quinielas, quiniela_settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Trophy } from "lucide-react";
import { redirect, notFound } from "next/navigation";

interface EditQuinielaPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQuinielaPage({
  params,
}: EditQuinielaPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/quinielas/${id}/edit`);
  }

  // Fetch quiniela with settings
  const quinielaWithSettings = await db
    .select({
      id: quinielas.id,
      name: quinielas.name,
      description: quinielas.description,
      ownerId: quinielas.ownerId,
      createdAt: quinielas.createdAt,
      updatedAt: quinielas.updatedAt,
      league: quinielas.league,
      externalLeagueId: quinielas.externalLeagueId,
      roundsSelected: quinielas.roundsSelected,
      // Settings
      prizeToWin: quiniela_settings.prizeToWin,
      prizeDistribution: quiniela_settings.prizeDistribution,
      allowEditPredictions: quiniela_settings.allowEditPredictions,
      pointsForExactResultPrediction:
        quiniela_settings.pointsForExactResultPrediction,
      pointsForCorrectResultPrediction:
        quiniela_settings.pointsForCorrectResultPrediction,
    })
    .from(quinielas)
    .innerJoin(
      quiniela_settings,
      eq(quinielas.id, quiniela_settings.quinielaId),
    )

    .where(eq(quinielas.id, id))
    .limit(1);

  if (!quinielaWithSettings.length) {
    notFound();
  }

  const quinielaData = quinielaWithSettings[0];

  // Check if user is the owner
  if (quinielaData.ownerId !== session.user.id) {
    redirect("/quinielas");
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Trophy className="h-8 w-8 text-primary" />
          Editar Quiniela
        </h1>
        <p className="mt-2 text-muted-foreground">
          Modifica los detalles y configuraciones de tu quiniela
        </p>
      </div>

      <EditQuinielaForm quiniela={quinielaData} />
    </div>
  );
}

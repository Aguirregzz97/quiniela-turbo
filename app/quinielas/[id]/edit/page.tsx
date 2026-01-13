import { auth } from "@/auth";
import EditQuinielaForm from "@/components/QuinielaComponents/EditQuinielaForm";
import { db } from "@/db";
import { quinielas, quiniela_settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Pencil, ArrowLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

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
      moneyToEnter: quiniela_settings.moneyToEnter,
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
    <div className="max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
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
          <Pencil className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Editar Quiniela
          </h1>
          <p className="text-sm text-muted-foreground">
            Modifica los detalles y configuraciones de tu quiniela
          </p>
        </div>
      </div>

      <EditQuinielaForm quiniela={quinielaData} />
    </div>
  );
}

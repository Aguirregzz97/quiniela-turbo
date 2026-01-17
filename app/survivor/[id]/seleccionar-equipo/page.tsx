import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Swords } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { survivor_games } from "@/db/schema";
import { eq } from "drizzle-orm";
import SeleccionarEquipo from "@/components/SurvivorComponents/SeleccionarEquipo";

interface SeleccionarEquipoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SeleccionarEquipoPage({
  params,
}: SeleccionarEquipoPageProps) {
  const { id } = await params;

  const session = await auth();

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/survivor/${id}/seleccionar-equipo`);
  }

  // Fetch survivor game data
  const survivorGameData = await db
    .select()
    .from(survivor_games)
    .where(eq(survivor_games.id, id))
    .limit(1);

  if (!survivorGameData.length) {
    notFound();
  }

  const survivorGame = survivorGameData[0];

  return (
    <div className="max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Back Button */}
      <Link
        href={`/survivor/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Survivor
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <Swords className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Seleccionar Equipo
          </h1>
          <p className="text-sm text-muted-foreground">{survivorGame.name}</p>
        </div>
      </div>

      {/* Selection content */}
      <SeleccionarEquipo survivorGame={survivorGame} userId={session.user.id} />
    </div>
  );
}

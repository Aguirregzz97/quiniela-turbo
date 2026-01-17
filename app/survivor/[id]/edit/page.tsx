import { auth } from "@/auth";
import EditSurvivorForm from "@/components/SurvivorComponents/EditSurvivorForm";
import { db } from "@/db";
import { survivor_games } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Pencil, ArrowLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface EditSurvivorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditSurvivorPage({
  params,
}: EditSurvivorPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/survivor/${id}/edit`);
  }

  // Fetch survivor game
  const survivorGame = await db
    .select({
      id: survivor_games.id,
      name: survivor_games.name,
      description: survivor_games.description,
      ownerId: survivor_games.ownerId,
      lives: survivor_games.lives,
      moneyToEnter: survivor_games.moneyToEnter,
      prizeDistribution: survivor_games.prizeDistribution,
      createdAt: survivor_games.createdAt,
      updatedAt: survivor_games.updatedAt,
    })
    .from(survivor_games)
    .where(eq(survivor_games.id, id))
    .limit(1);

  if (!survivorGame.length) {
    notFound();
  }

  const survivorData = survivorGame[0];

  // Check if user is the owner
  if (survivorData.ownerId !== session.user.id) {
    redirect("/survivor");
  }

  return (
    <div className="max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
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
          <Pencil className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Editar Survivor
          </h1>
          <p className="text-sm text-muted-foreground">
            Modifica los detalles y configuraciones de tu Survivor
          </p>
        </div>
      </div>

      <EditSurvivorForm survivorGame={survivorData} />
    </div>
  );
}


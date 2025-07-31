import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dices } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { quinielas } from "@/db/schema";
import { eq } from "drizzle-orm";
import RegistrarPronosticos from "@/components/QuinielaComponents/RegistrarPronosticos";

interface RegistrarPronosticosPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RegistrarPronosticosPage({
  params,
}: RegistrarPronosticosPageProps) {
  const { id } = await params;

  const session = await auth();

  if (!session) {
    redirect(
      `/api/auth/signin?callbackUrl=/quinielas/${id}/registrar-pronosticos`,
    );
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
            <Dices className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Registrar Pronósticos
            </h1>
          </div>
        </div>
      </div>

      {/* Predictions content */}
      <RegistrarPronosticos quiniela={quiniela} userId={session.user.id} />
    </div>
  );
}

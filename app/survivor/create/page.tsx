import { Swords, ArrowLeft } from "lucide-react";
import Link from "next/link";
import CreateSurvivorForm from "@/components/SurvivorComponents/CreateSurvivorForm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function CreateSurvivorPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/survivor/create");
  }

  return (
    <div className="max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Back Button */}
      <Link
        href="/survivor"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <Swords className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Crear Nuevo Survivor
          </h1>
          <p className="text-sm text-muted-foreground">
            Completa los detalles para crear un nuevo juego de Survivor
          </p>
        </div>
      </div>

      <CreateSurvivorForm />
    </div>
  );
}


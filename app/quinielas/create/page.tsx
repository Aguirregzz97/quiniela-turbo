import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import CreateQuinielaForm from "@/components/QuinielaComponents/CreateQuinielaForm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function CreateQuinielaPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/quinielas/create");
  }

  return (
    <div className="max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Back Button */}
      <Link
        href="/quinielas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <Trophy className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Crear Nueva Quiniela
          </h1>
          <p className="text-sm text-muted-foreground">
            Completa los detalles para crear una nueva quiniela
          </p>
        </div>
      </div>

      <CreateQuinielaForm />
    </div>
  );
}

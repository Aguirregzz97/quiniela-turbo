import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import CreateQuinielaForm from "@/components/QuinielaComponents/CreateQuinielaForm";

export default function CreateQuinielaPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/quinielas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Trophy className="h-8 w-8 text-primary" />
          Crear Nueva Quiniela
        </h1>
        <p className="mt-2 text-muted-foreground">
          Completa los detalles para crear una nueva quiniela
        </p>
      </div>

      <div className="max-w-2xl">
        <CreateQuinielaForm />
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function QuinielasPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Trophy className="h-8 w-8 text-primary" />
          Quinielas
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gestiona y participa en quinielas de padel
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mis Quinielas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Aquí podrás ver y gestionar todas tus quinielas activas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Quiniela</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Crea una nueva quiniela para un torneo o evento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

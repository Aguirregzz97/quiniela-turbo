import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowLeft, Copy, Users, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { quinielas, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import ClickableJoinCode from "@/components/QuinielaComponents/ClickableJoinCode";
import CopyJoinLinkButton from "@/components/QuinielaComponents/CopyJoinLinkButton";

interface QuinielaPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuinielaPage({ params }: QuinielaPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/quinielas/${id}`);
  }

  const quinielaWithOwner = await db
    .select({
      id: quinielas.id,
      name: quinielas.name,
      description: quinielas.description,
      joinCode: quinielas.joinCode,
      createdAt: quinielas.createdAt,
      updatedAt: quinielas.updatedAt,
      ownerId: quinielas.ownerId,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(quinielas)
    .innerJoin(users, eq(quinielas.ownerId, users.id))
    .where(eq(quinielas.id, id))
    .limit(1);

  if (!quinielaWithOwner.length) {
    notFound();
  }

  const quinielaData = quinielaWithOwner[0];

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Header with back button */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/quinielas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Quinielas
            </Link>
          </Button>

          {session.user.id === quinielaData.ownerId && (
            <Button asChild>
              <Link href={`/quinielas/${quinielaData.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar Quiniela
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {quinielaData.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Quiniela Details */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Quiniela</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Descripción</h3>
                <p className="text-muted-foreground">
                  {quinielaData.description || "Sin descripción"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold">Propietario</h3>
                  <div className="space-y-1">
                    {quinielaData.ownerName && (
                      <p className="text-muted-foreground">
                        {quinielaData.ownerName}
                      </p>
                    )}
                    {quinielaData.ownerEmail && (
                      <p className="text-sm text-muted-foreground">
                        {quinielaData.ownerEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Fecha de Creación</h3>
                  <p className="text-muted-foreground">
                    {new Date(quinielaData.createdAt).toLocaleDateString(
                      "es-ES",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold">Código de Unión</h3>
                <ClickableJoinCode joinCode={quinielaData.joinCode} />
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Haz clic en el código para copiarlo
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold">Enlace de Unión</h3>
                <div className="space-y-3">
                  <div className="break-all rounded-lg bg-primary/10 px-3 py-2 text-center font-mono text-lg font-bold text-primary sm:px-4 sm:py-3 sm:text-xl">
                    {`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/quinielas/join/${quinielaData.joinCode}`}
                  </div>
                  <div className="flex justify-center">
                    <CopyJoinLinkButton joinCode={quinielaData.joinCode} />
                  </div>
                </div>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Comparte este enlace para que otros puedan unirse directamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for future content */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades Futuras</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Aquí se mostrarán las predicciones, participantes, y estadísticas
              de la quiniela.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

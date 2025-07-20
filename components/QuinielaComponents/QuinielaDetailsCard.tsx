"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ClickableJoinCode from "./ClickableJoinCode";
import CopyJoinLinkButton from "./CopyJoinLinkButton";

interface QuinielaDetailsCardProps {
  quinielaData: {
    name: string;
    description: string | null;
    league: string | null;
    externalLeagueId: string | null;
    joinCode: string;
    createdAt: Date;
    ownerName: string | null;
    ownerEmail: string | null;
  };
}

export default function QuinielaDetailsCard({
  quinielaData,
}: QuinielaDetailsCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className={`cursor-pointer transition-all duration-200 ease-in-out hover:rounded-t-xl hover:bg-muted/50 ${isOpen ? "mb-4 border-b border-b-muted-foreground" : ""}`}
          >
            <div className="flex items-center justify-center sm:justify-between">
              <CardTitle className="text-center sm:text-left">
                Detalles de la Quiniela
              </CardTitle>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-sm text-muted-foreground">
                  {isOpen ? "Ocultar" : "Mostrar"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
                />
              </div>
              <div className="sm:hidden">
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold">Liga</h3>
                  <div className="flex items-center gap-3">
                    {quinielaData.externalLeagueId ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded border bg-white shadow-sm">
                        <Image
                          src={`https://media.api-sports.io/football/leagues/${quinielaData.externalLeagueId}.png`}
                          alt={quinielaData.league || "Liga"}
                          width={24}
                          height={24}
                          className="h-6 w-6 object-contain"
                        />
                      </div>
                    ) : null}
                    <p className="text-muted-foreground">
                      {quinielaData.league || "No especificada"}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Propietario</h3>
                  <div className="space-y-1">
                    {quinielaData.ownerName && (
                      <p className="text-muted-foreground">
                        {quinielaData.ownerName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold">Descripción</h3>
                  <p className="text-muted-foreground">
                    {quinielaData.description || "Sin descripción"}
                  </p>
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

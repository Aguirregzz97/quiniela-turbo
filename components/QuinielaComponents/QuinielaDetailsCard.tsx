"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronDown,
  Info,
  Link2,
  Calendar,
  User,
  FileText,
} from "lucide-react";
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
    <Card className="border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className={`cursor-pointer transition-all duration-200 hover:bg-muted/30 ${isOpen ? "border-b border-border/50" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">
                  Detalles de la Quiniela
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {isOpen ? "Ocultar" : "Mostrar"}
                </span>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${isOpen ? "bg-primary/10" : "bg-muted/50"}`}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : "text-muted-foreground"}`}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <CardContent className="pt-4">
            <div className="space-y-5">
              {/* Join Code Section */}
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Código de Unión
                </h3>
                <ClickableJoinCode joinCode={quinielaData.joinCode} />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Haz clic en el código para copiarlo
                </p>
              </div>

              {/* Join Link Section */}
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Enlace de Unión
                </h3>
                <div className="space-y-3">
                  <div className="break-all rounded-lg border border-border/50 bg-background px-3 py-2 text-center font-mono text-sm text-muted-foreground">
                    {`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/quinielas/join/${quinielaData.joinCode}`}
                  </div>
                  <div className="flex justify-center">
                    <CopyJoinLinkButton joinCode={quinielaData.joinCode} />
                  </div>
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Comparte este enlace para que otros puedan unirse directamente
                </p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Liga */}
                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  {quinielaData.externalLeagueId ? (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                      <Image
                        src={`https://media.api-sports.io/football/leagues/${quinielaData.externalLeagueId}.png`}
                        alt={quinielaData.league || "Liga"}
                        width={28}
                        height={28}
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Link2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Liga</p>
                    <p className="truncate text-sm font-medium">
                      {quinielaData.league || "No especificada"}
                    </p>
                  </div>
                </div>

                {/* Admin */}
                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Admin</p>
                    <p className="truncate text-sm font-medium">
                      {quinielaData.ownerName || "Desconocido"}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Descripción</p>
                    <p className="text-sm font-medium">
                      {quinielaData.description || "Sin descripción"}
                    </p>
                  </div>
                </div>

                {/* Created Date */}
                <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      Fecha de Creación
                    </p>
                    <p className="text-sm font-medium">
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
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

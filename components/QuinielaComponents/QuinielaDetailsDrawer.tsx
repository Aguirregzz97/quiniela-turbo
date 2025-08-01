"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Info, X } from "lucide-react";
import Image from "next/image";
import ClickableJoinCode from "./ClickableJoinCode";
import CopyJoinLinkButton from "./CopyJoinLinkButton";

interface QuinielaDetailsDrawerProps {
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

export default function QuinielaDetailsDrawer({
  quinielaData,
}: QuinielaDetailsDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="h-4 w-4" />
          Detalles
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold">
              Detalles de la Quiniela
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Join Code Section - Now at top */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Código de Unión</h3>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <ClickableJoinCode joinCode={quinielaData.joinCode} />
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Haz clic en el código para copiarlo
                </p>
              </div>
            </div>

            {/* Join Link Section - Also at top */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Enlace de Unión</h3>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="mb-3 break-all rounded-md bg-background px-3 py-2 font-mono text-sm">
                  {`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/quinielas/join/${quinielaData.joinCode}`}
                </div>
                <div className="flex justify-center">
                  <CopyJoinLinkButton joinCode={quinielaData.joinCode} />
                </div>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Comparte este enlace para que otros puedan unirse directamente
                </p>
              </div>
            </div>

            {/* League and Admin Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Liga</h3>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  {quinielaData.externalLeagueId ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white shadow-sm">
                      <Image
                        src={`https://media.api-sports.io/football/leagues/${quinielaData.externalLeagueId}.png`}
                        alt={quinielaData.league || "Liga"}
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Info className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {quinielaData.league || "No especificada"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Liga de la quiniela
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Admin</h3>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">
                    {quinielaData.ownerName || "Admin"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Administrador de la quiniela
                  </p>
                </div>
              </div>
            </div>

            {/* Description and Creation Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Descripción</h3>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm">
                    {quinielaData.description || "Sin descripción"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Fecha de Creación
                </h3>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">
                    {new Date(quinielaData.createdAt).toLocaleDateString(
                      "es-ES",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(quinielaData.createdAt).toLocaleTimeString(
                      "es-ES",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Info,
  Users,
  DollarSign,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import QuinielaDetailsDrawer from "./QuinielaDetailsDrawer";
import QuinielaParticipantsDrawer from "./QuinielaParticipantsDrawer";
import PrizeBreakdownDrawer from "./PrizeBreakdownDrawer";
import DeleteQuinielaDialog from "./DeleteQuinielaDialog";
import type { Quiniela } from "@/db/schema";
import type { PrizeDistribution } from "@/lib/prizes";

interface Participant {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  joinedAt: Date;
}

interface QuinielaHeaderMenuProps {
  quiniela: Quiniela;
  detailsData: React.ComponentProps<typeof QuinielaDetailsDrawer>["quinielaData"];
  participants: Participant[];
  currentUserId: string;
  isAdmin: boolean;
  exactPoints: number;
  correctResultPoints: number;
  moneyToEnter: number | null;
  prizeDistribution: PrizeDistribution[] | null;
  moneyPerRoundToEnter: number | null;
  prizeDistributionPerRound: PrizeDistribution[] | null;
}

type Action = "details" | "participants" | "prizes" | "delete" | null;

export default function QuinielaHeaderMenu({
  quiniela,
  detailsData,
  participants,
  currentUserId,
  isAdmin,
  exactPoints,
  correctResultPoints,
  moneyToEnter,
  prizeDistribution,
  moneyPerRoundToEnter,
  prizeDistributionPerRound,
}: QuinielaHeaderMenuProps) {
  const [active, setActive] = useState<Action>(null);

  const close = () => setActive(null);
  const openIf = (a: Action, isOpen: boolean) => {
    if (!isOpen && active === a) close();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            aria-label="Más opciones"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Quiniela</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setActive("details")}>
            <Info className="mr-2 h-4 w-4" />
            Detalles
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setActive("participants")}>
            <Users className="mr-2 h-4 w-4" />
            Participantes
            <span className="ml-auto text-xs text-muted-foreground">
              {participants.length}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setActive("prizes")}>
            <DollarSign className="mr-2 h-4 w-4" />
            Premios
          </DropdownMenuItem>

          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Administración</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/quinielas/${quiniela.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar quiniela
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setActive("delete")}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar quiniela
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <QuinielaDetailsDrawer
        quinielaData={detailsData}
        participantCount={participants.length}
        hideDefaultTrigger
        open={active === "details"}
        onOpenChange={(o) => openIf("details", o)}
      />

      <QuinielaParticipantsDrawer
        quinielaId={quiniela.id}
        ownerId={quiniela.ownerId}
        currentUserId={currentUserId}
        participants={participants}
        hideDefaultTrigger
        open={active === "participants"}
        onOpenChange={(o) => openIf("participants", o)}
      />

      <PrizeBreakdownDrawer
        quiniela={quiniela}
        participants={participants}
        exactPoints={exactPoints}
        correctResultPoints={correctResultPoints}
        moneyToEnter={moneyToEnter}
        prizeDistribution={prizeDistribution}
        moneyPerRoundToEnter={moneyPerRoundToEnter}
        prizeDistributionPerRound={prizeDistributionPerRound}
        hideDefaultTrigger
        open={active === "prizes"}
        onOpenChange={(o) => openIf("prizes", o)}
      />

      {isAdmin && (
        <DeleteQuinielaDialog
          quinielaId={quiniela.id}
          quinielaName={quiniela.name}
          hideDefaultTrigger
          open={active === "delete"}
          onOpenChange={(o) => openIf("delete", o)}
        />
      )}
    </>
  );
}

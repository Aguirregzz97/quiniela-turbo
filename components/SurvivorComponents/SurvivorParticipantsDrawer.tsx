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
import {
  Users,
  X,
  UserMinus,
  Crown,
  Loader2,
  Heart,
  Skull,
} from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { kickSurvivorParticipant } from "@/app/survivor/kick-participant-action";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Participant {
  id: string;
  oderId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  livesRemaining: number;
  isEliminated: boolean;
  joinedAt: Date;
}

interface SurvivorParticipantsDrawerProps {
  survivorGameId: string;
  ownerId: string;
  currentUserId: string;
  totalLives: number;
  participants: Participant[];
}

export default function SurvivorParticipantsDrawer({
  survivorGameId,
  ownerId,
  currentUserId,
  totalLives,
  participants,
}: SurvivorParticipantsDrawerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
  const [confirmKickUser, setConfirmKickUser] = useState<Participant | null>(
    null,
  );

  const isOwner = currentUserId === ownerId;

  const handleKick = (participant: Participant) => {
    setConfirmKickUser(participant);
  };

  const confirmKick = () => {
    if (!confirmKickUser) return;

    setKickingUserId(confirmKickUser.oderId);
    startTransition(async () => {
      const result = await kickSurvivorParticipant(
        survivorGameId,
        confirmKickUser.oderId,
      );

      if (result.success) {
        toast({
          title: "Participante expulsado",
          description: `${confirmKickUser.userName || "El participante"} ha sido expulsado del Survivor.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }

      setKickingUserId(null);
      setConfirmKickUser(null);
    });
  };

  // Sort participants: active first, then eliminated
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isEliminated === b.isEliminated) return 0;
    return a.isEliminated ? 1 : -1;
  });

  const activeCount = participants.filter((p) => !p.isEliminated).length;
  const eliminatedCount = participants.filter((p) => p.isEliminated).length;

  return (
    <>
      <Drawer direction="right">
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm">
            <Users className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Participantes</span>
            <span className="ml-1">({participants.length})</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Participantes ({participants.length})
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
            {/* Stats */}
            <div className="mt-3 flex gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-600">
                <Heart className="h-4 w-4" />
                {activeCount} activos
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Skull className="h-4 w-4" />
                {eliminatedCount} eliminados
              </span>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {sortedParticipants.map((participant) => {
                const isParticipantOwner = participant.oderId === ownerId;
                const isKicking = kickingUserId === participant.oderId;

                return (
                  <div
                    key={participant.id}
                    className={`relative rounded-lg p-3 pr-10 ${
                      participant.isEliminated
                        ? "bg-muted/30 opacity-60"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                        <Image
                          src={participant.userImage || "/img/profile.png"}
                          alt={participant.userName || "Participante"}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                        {participant.isEliminated && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Skull className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-medium ${participant.isEliminated ? "line-through" : ""}`}
                        >
                          {participant.userName || "Sin nombre"}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex items-center gap-1 text-xs ${
                              participant.isEliminated
                                ? "text-destructive"
                                : "text-green-600"
                            }`}
                          >
                            {participant.isEliminated ? (
                              <>
                                <Skull className="h-3 w-3" />
                                Eliminado
                              </>
                            ) : (
                              <>
                                <Heart className="h-3 w-3" />
                                {participant.livesRemaining}/{totalLives} vidas
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isParticipantOwner && (
                      <Crown className="absolute right-3 top-3 h-4 w-4 text-yellow-500" />
                    )}

                    {isOwner && !isParticipantOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleKick(participant)}
                        disabled={isPending}
                      >
                        {isKicking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={!!confirmKickUser}
        onOpenChange={(open) => !open && setConfirmKickUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Expulsar participante?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas expulsar a{" "}
              <span className="font-semibold">
                {confirmKickUser?.userName || "este participante"}
              </span>{" "}
              del Survivor? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmKick}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Expulsar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


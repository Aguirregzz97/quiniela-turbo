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
import { Users, X, UserMinus, Crown, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { kickParticipant } from "@/app/quinielas/kick-participant-action";
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
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  joinedAt: Date;
}

interface QuinielaParticipantsDrawerProps {
  quinielaId: string;
  ownerId: string;
  currentUserId: string;
  participants: Participant[];
}

export default function QuinielaParticipantsDrawer({
  quinielaId,
  ownerId,
  currentUserId,
  participants,
}: QuinielaParticipantsDrawerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
  const [confirmKickUser, setConfirmKickUser] = useState<Participant | null>(
    null
  );

  const isOwner = currentUserId === ownerId;

  const handleKick = (participant: Participant) => {
    setConfirmKickUser(participant);
  };

  const confirmKick = () => {
    if (!confirmKickUser) return;

    setKickingUserId(confirmKickUser.userId);
    startTransition(async () => {
      const result = await kickParticipant(quinielaId, confirmKickUser.userId);

      if (result.success) {
        toast({
          title: "Participante expulsado",
          description: `${confirmKickUser.userName || "El participante"} ha sido expulsado de la quiniela.`,
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
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {participants.map((participant) => {
                const isParticipantOwner = participant.userId === ownerId;
                const isKicking = kickingUserId === participant.userId;

                return (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
                        <Image
                          src={participant.userImage || "/img/profile.png"}
                          alt={participant.userName || "Participante"}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {participant.userName || "Sin nombre"}
                          </p>
                          {isParticipantOwner && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {participant.userEmail}
                        </p>
                      </div>
                    </div>

                    {isOwner && !isParticipantOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
              de la quiniela? Esta acción no se puede deshacer.
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

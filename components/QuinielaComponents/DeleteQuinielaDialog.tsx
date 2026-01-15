"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { deleteQuiniela } from "@/app/quinielas/delete-action";

interface DeleteQuinielaDialogProps {
  quinielaId: string;
  quinielaName: string;
}

export default function DeleteQuinielaDialog({
  quinielaId,
  quinielaName,
}: DeleteQuinielaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isConfirmed = confirmationText === quinielaName;

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(quinielaName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo copiar el nombre",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      await deleteQuiniela(quinielaId);
      toast({
        title: "Quiniela eliminada",
        description: "La quiniela ha sido eliminada exitosamente",
      });
      setOpen(false);
      router.push("/quinielas");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la quiniela",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog closes
      setConfirmationText("");
      setCopied(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Eliminar</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Quiniela
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              <p>
                Esta acción es <strong>permanente e irreversible</strong>. Se
                eliminarán:
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Todos los participantes de la quiniela</li>
                <li>Todos los pronósticos registrados</li>
                <li>Toda la configuración de la quiniela</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Quiniela name to copy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Escribe el nombre de la quiniela para confirmar:
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <code className="flex-1 truncate text-sm font-semibold">
                {quinielaName}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-2"
                onClick={handleCopyName}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs text-green-500">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-xs">Copiar</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <Input
              placeholder="Escribe el nombre de la quiniela"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className={
                confirmationText && !isConfirmed
                  ? "border-destructive focus-visible:ring-destructive"
                  : isConfirmed
                    ? "border-green-500 focus-visible:ring-green-500"
                    : ""
              }
            />
            {confirmationText && !isConfirmed && (
              <p className="text-xs text-destructive">El nombre no coincide</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Quiniela
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

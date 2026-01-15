"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, KeyRound, Ticket } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { joinQuinielaByCode } from "@/app/quinielas/join-by-code-action";

// Zod schema for join quiniela
const joinQuinielaSchema = z.object({
  joinCode: z
    .string()
    .min(1, "El código de unión es requerido")
    .max(6, "El código debe tener máximo 6 caracteres"),
});

type JoinQuinielaFormData = z.infer<typeof joinQuinielaSchema>;

interface JoinQuinielaFormProps {
  initialJoinCode?: string;
}

export default function JoinQuinielaForm({
  initialJoinCode,
}: JoinQuinielaFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<JoinQuinielaFormData>({
    resolver: zodResolver(joinQuinielaSchema),
    defaultValues: {
      joinCode: initialJoinCode || "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (data: JoinQuinielaFormData) => {
    setIsSubmitting(true);
    try {
      const result = await joinQuinielaByCode(data.joinCode.toUpperCase());

      // Invalidate predictions cache so leaderboard shows the new user
      await queryClient.invalidateQueries({
        queryKey: ["all-predictions", result.quinielaId],
      });

      toast({
        title: "¡Te has unido exitosamente!",
        description: `Te has unido a la quiniela "${result.quinielaName}"`,
      });
      router.push(`/quinielas/${result.quinielaId}`);
    } catch (error) {
      toast({
        title: "Error al unirse",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo unir a la quiniela",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Code Input Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Código de Unión</span>
            </div>
            <Input
              id="joinCode"
              {...register("joinCode")}
              placeholder="ABC123"
              className="h-14 border-border/50 text-center font-mono text-xl uppercase tracking-widest"
              maxLength={6}
              autoComplete="off"
            />
            {errors.joinCode && (
              <p className="text-center text-sm text-destructive">
                {errors.joinCode.message}
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Ingresa el código de 6 caracteres que te compartieron
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uniéndose...
              </>
            ) : (
              <>
                Unirse a Quiniela
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 border-t border-border/50 pt-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
              <Ticket className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                ¿No tienes un código?
              </p>
              <Button
                variant="link"
                className="h-auto p-0 text-sm font-medium"
                onClick={() => router.push("/quinielas")}
              >
                Ver mis quinielas →
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

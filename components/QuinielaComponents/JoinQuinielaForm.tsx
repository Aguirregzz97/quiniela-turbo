"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ArrowRight } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
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
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Unirse a Quiniela
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinCode">Código de Unión</Label>
              <Input
                id="joinCode"
                {...register("joinCode")}
                placeholder="Ej: ABC123"
                className="w-full text-center font-mono text-lg"
                maxLength={6}
                autoComplete="off"
              />
              {errors.joinCode && (
                <p className="text-sm text-destructive">
                  {errors.joinCode.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
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

          <div className="mt-6 border-t pt-4">
            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes un código?{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => router.push("/quinielas")}
              >
                Ver mis quinielas
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

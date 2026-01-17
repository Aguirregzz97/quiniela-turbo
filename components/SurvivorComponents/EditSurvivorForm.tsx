"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Settings, FileText, Heart } from "lucide-react";
import { updateSurvivorGame } from "@/app/survivor/update-action";

import PrizeDistributionForm from "@/components/QuinielaComponents/PrizeDistributionForm";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

// Zod schema for survivor updates (simplified - no league or rounds editing)
const updateSurvivorSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z
    .string()
    .min(1, "La descripción es requerida")
    .max(500, "La descripción no puede exceder 500 caracteres"),
  lives: z
    .number()
    .min(1, "Debe haber al menos 1 vida")
    .max(5, "Máximo 5 vidas")
    .int("Las vidas deben ser un número entero"),
  moneyToEnter: z
    .number()
    .min(0, "El dinero de entrada no puede ser negativo")
    .int("El dinero de entrada debe ser un número entero"),
  prizeDistribution: z
    .array(
      z.object({
        position: z.number(),
        percentage: z
          .number()
          .min(1, "El porcentaje debe ser mayor a 0")
          .max(100, "El porcentaje no puede exceder 100"),
      }),
    )
    .min(1, "Debe haber al menos una posición de premio")
    .refine(
      (positions) => {
        const total = positions.reduce((sum, pos) => sum + pos.percentage, 0);
        return total === 100;
      },
      {
        message: "El total de porcentajes debe ser 100%",
        path: ["prizeDistribution"],
      },
    )
    .refine(
      (positions) => {
        return !positions.some((pos) => pos.percentage === 0);
      },
      {
        message: "Todas las posiciones deben tener un porcentaje mayor a 0%",
        path: ["prizeDistribution"],
      },
    ),
});

export type UpdateSurvivorFormData = z.infer<typeof updateSurvivorSchema>;

interface EditSurvivorFormProps {
  survivorGame: {
    id: string;
    name: string;
    description: string | null;
    lives: number;
    moneyToEnter: number;
    prizeDistribution: { position: number; percentage: number }[];
  };
}

export default function EditSurvivorForm({
  survivorGame,
}: EditSurvivorFormProps) {
  const router = useRouter();

  const form = useForm<UpdateSurvivorFormData>({
    resolver: zodResolver(updateSurvivorSchema),
    defaultValues: {
      name: survivorGame.name,
      description: survivorGame.description || "",
      lives: survivorGame.lives,
      moneyToEnter: survivorGame.moneyToEnter,
      prizeDistribution: survivorGame.prizeDistribution,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (data: UpdateSurvivorFormData) => {
    try {
      await updateSurvivorGame(survivorGame.id, data);
      toast({
        title: "¡Survivor actualizado!",
        description: "Tu juego de Survivor ha sido actualizado exitosamente.",
      });
      router.push(`/survivor/${survivorGame.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al actualizar el Survivor",
        variant: "destructive",
      });
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Survivor Details Section */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Detalles del Survivor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Survivor *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Ej: Survivor Liga MX Clausura 2025"
                className="border-border/50"
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe los detalles de tu juego de Survivor..."
                rows={3}
                className="resize-none border-border/50"
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Survivor Settings Section */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Ajustes del Survivor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Lives Configuration */}
              <div className="space-y-2">
                <Label htmlFor="lives" className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Número de Vidas *
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cantidad de veces que un jugador puede perder antes de ser
                  eliminado
                </p>
                <Input
                  id="lives"
                  type="number"
                  {...register("lives", { valueAsNumber: true })}
                  placeholder="1"
                  className="w-24 border-border/50"
                  min={1}
                  max={5}
                />
                {errors.lives && (
                  <p className="text-sm text-destructive">
                    {errors.lives.message}
                  </p>
                )}
              </div>

              {/* Prize Configuration */}
              <div className="space-y-2 border-t border-border/50 pt-4">
                <Label htmlFor="moneyToEnter">Precio de entrada</Label>
                <p className="text-xs text-muted-foreground">
                  Deja en 0 si el juego es gratuito
                </p>
                <div className="relative">
                  <Input
                    id="moneyToEnter"
                    type="number"
                    {...register("moneyToEnter", { valueAsNumber: true })}
                    placeholder="Ej: 100"
                    className="border-border/50 pl-7"
                    min={0}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                </div>
                {errors.moneyToEnter && (
                  <p className="text-sm text-destructive">
                    {errors.moneyToEnter.message}
                  </p>
                )}
              </div>

              {/* Prize Distribution Section */}
              <div className="border-t border-border/50 pt-4">
                <PrizeDistributionForm name="prizeDistribution" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 flex-1 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Actualizando Survivor...
              </>
            ) : (
              "Actualizar Survivor"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/survivor/${survivorGame.id}`)}
            disabled={isSubmitting}
            className="h-11 border-border/50 sm:w-auto"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}


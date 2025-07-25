"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Settings, FileText, Trophy } from "lucide-react";
import { updateQuiniela } from "@/app/quinielas/update-action";
import { Switch } from "@/components/ui/switch";

import PrizeDistributionForm from "./PrizeDistributionForm";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

// Zod schema for quiniela updates (simplified - no league or rounds editing)
const updateQuinielaSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z
    .string()
    .min(1, "La descripción es requerida")
    .max(500, "La descripción no puede exceder 500 caracteres"),
  moneyToEnter: z
    .number()
    .min(1, "El dinero de entrada debe ser mayor a 0")
    .int("El dinero de entrada debe ser un número entero"),
  pointsForExactResultPrediction: z
    .number()
    .min(1, "Mínimo 1 punto")
    .max(10, "Máximo 10 puntos"),
  pointsForCorrectResultPrediction: z
    .number()
    .min(1, "Mínimo 1 punto")
    .max(10, "Máximo 10 puntos"),
  allowEditPredictions: z.boolean(),
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

export type UpdateQuinielaFormData = z.infer<typeof updateQuinielaSchema>;

interface EditQuinielaFormProps {
  quiniela: {
    id: string;
    name: string;
    description: string | null;
    moneyToEnter: number;
    prizeDistribution: { position: number; percentage: number }[];
    allowEditPredictions: boolean;
    pointsForExactResultPrediction: number;
    pointsForCorrectResultPrediction: number;
  };
}

export default function EditQuinielaForm({ quiniela }: EditQuinielaFormProps) {
  const router = useRouter();

  const form = useForm<UpdateQuinielaFormData>({
    resolver: zodResolver(updateQuinielaSchema),
    defaultValues: {
      name: quiniela.name,
      description: quiniela.description || "",
      moneyToEnter: quiniela.moneyToEnter,
      pointsForExactResultPrediction: quiniela.pointsForExactResultPrediction,
      pointsForCorrectResultPrediction:
        quiniela.pointsForCorrectResultPrediction,
      allowEditPredictions: quiniela.allowEditPredictions,
      prizeDistribution: quiniela.prizeDistribution,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = form;

  const allowEditPredictions = watch("allowEditPredictions");

  const onSubmit = async (data: UpdateQuinielaFormData) => {
    try {
      await updateQuiniela(quiniela.id, data);
      toast({
        title: "¡Quiniela actualizada!",
        description: "Tu quiniela ha sido actualizada exitosamente.",
      });
      router.push(`/quinielas/${quiniela.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al actualizar la quiniela",
        variant: "destructive",
      });
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        {/* Quiniela Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles de la Quiniela
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Quiniela *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Ej: Quiniela del Torneo de Padel"
                className="w-full"
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
                placeholder="Describe los detalles de tu quiniela..."
                rows={3}
                className="w-full resize-none"
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quiniela Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Ajustes de la Quiniela
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Prize Configuration */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="moneyToEnter">Precio de entrada *</Label>
                  <div className="relative">
                    <Input
                      id="moneyToEnter"
                      type="number"
                      {...register("moneyToEnter", { valueAsNumber: true })}
                      placeholder="Ej: 1000"
                      className="w-full pl-8"
                      min={1}
                    />
                    <Trophy className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {errors.moneyToEnter && (
                    <p className="text-sm text-destructive">
                      {errors.moneyToEnter.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Points Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Configuración de Puntos
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pointsForExactResultPrediction">
                      Puntos por Resultado Exacto
                    </Label>
                    <Input
                      id="pointsForExactResultPrediction"
                      type="number"
                      {...register("pointsForExactResultPrediction", {
                        valueAsNumber: true,
                      })}
                      min={1}
                      max={10}
                      className="w-full"
                    />
                    {errors.pointsForExactResultPrediction && (
                      <p className="text-sm text-destructive">
                        {errors.pointsForExactResultPrediction.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pointsForCorrectResultPrediction">
                      Puntos por Resultado Correcto
                    </Label>
                    <Input
                      id="pointsForCorrectResultPrediction"
                      type="number"
                      {...register("pointsForCorrectResultPrediction", {
                        valueAsNumber: true,
                      })}
                      min={1}
                      max={10}
                      className="w-full"
                    />
                    {errors.pointsForCorrectResultPrediction && (
                      <p className="text-sm text-destructive">
                        {errors.pointsForCorrectResultPrediction.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Predictions Toggle */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="allowEditPredictions">
                    Permitir Editar Predicciones
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Los participantes podrán modificar sus predicciones hasta el
                    inicio del partido
                  </p>
                </div>
                <Switch
                  id="allowEditPredictions"
                  checked={allowEditPredictions}
                  onCheckedChange={(checked) =>
                    setValue("allowEditPredictions", checked)
                  }
                />
              </div>

              {/* Prize Distribution Section */}
              <div className="border-t pt-6">
                <PrizeDistributionForm name="prizeDistribution" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando Quiniela...
              </>
            ) : (
              "Actualizar Quiniela"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/quinielas/${quiniela.id}`)}
            disabled={isSubmitting}
            className="sm:w-auto"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

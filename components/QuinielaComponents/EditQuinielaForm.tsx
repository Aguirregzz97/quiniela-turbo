"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings, FileText, Trophy } from "lucide-react";
import { updateQuiniela } from "@/app/quinielas/update-action";
import { Switch } from "@/components/ui/switch";

import PrizeDistributionForm from "./PrizeDistributionForm";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useRounds } from "@/hooks/useRounds";

// Temporary hardcoded leagues - will come from API later
const LEAGUES = [
  { id: 1, name: "Liga MX 2025" },
  { id: 2, name: "Premier League 2024/25" },
  { id: 3, name: "La Liga 2024/25" },
  { id: 4, name: "Serie A 2024/25" },
  { id: 5, name: "Bundesliga 2024/25" },
];

// Zod schema for quiniela updates
const updateQuinielaSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z
    .string()
    .min(1, "La descripción es requerida")
    .max(500, "La descripción no puede exceder 500 caracteres"),
  league: z.string().min(1, "La liga es requerida"),
  externalLeagueId: z.string().min(1, "ID de liga requerido"),
  prizeToWin: z
    .number()
    .min(1, "El premio debe ser mayor a 0")
    .int("El premio debe ser un número entero"),
  desde: z.string().min(1, "Debe seleccionar una jornada de inicio"),
  hasta: z.string().min(1, "Debe seleccionar una jornada de fin"),
  roundsSelected: z
    .array(
      z.object({
        roundName: z.string(),
        dates: z.array(z.string()),
      }),
    )
    .min(1, "Debe seleccionar al menos una jornada"),
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
    league: string | null;
    externalLeagueId: string | null;
    prizeToWin: number;
    roundsSelected: { roundName: string; dates: string[] }[];
    prizeDistribution: { position: number; percentage: number }[];
    allowEditPredictions: boolean;
    pointsForExactResultPrediction: number;
    pointsForCorrectResultPrediction: number;
  };
}

export default function EditQuinielaForm({ quiniela }: EditQuinielaFormProps) {
  const router = useRouter();
  const {
    data: rounds,
    isLoading: roundsLoading,
    error: roundsError,
  } = useRounds();

  // Initialize desde/hasta from existing quiniela data
  const firstRound = quiniela.roundsSelected[0]?.roundName || "";
  const lastRound =
    quiniela.roundsSelected[quiniela.roundsSelected.length - 1]?.roundName ||
    "";

  // Create dynamic schema with rounds validation
  const updateQuinielaSchemaWithValidation = useMemo(() => {
    return updateQuinielaSchema.refine(
      (data) => {
        if (!rounds?.response || !data.desde || !data.hasta) {
          return true; // Skip validation if data not available
        }

        const desdeIndex = rounds.response.findIndex(
          (r) => r.round === data.desde,
        );
        const hastaIndex = rounds.response.findIndex(
          (r) => r.round === data.hasta,
        );

        return desdeIndex <= hastaIndex;
      },
      {
        message:
          "La jornada 'desde' debe ser anterior o igual a la jornada 'hasta'",
        path: ["hasta"],
      },
    );
  }, [rounds]);

  const form = useForm<UpdateQuinielaFormData>({
    resolver: zodResolver(updateQuinielaSchemaWithValidation),
    defaultValues: {
      name: quiniela.name,
      description: quiniela.description || "",
      league: quiniela.league || "",
      externalLeagueId: quiniela.externalLeagueId || "",
      prizeToWin: quiniela.prizeToWin,
      desde: firstRound,
      hasta: lastRound,
      roundsSelected: quiniela.roundsSelected,
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
    trigger,
  } = form;

  const allowEditPredictions = watch("allowEditPredictions");

  // Convert desde/hasta selection to roundsSelected format
  useEffect(() => {
    const desde = watch("desde");
    const hasta = watch("hasta");

    if (!rounds?.response || !desde || !hasta) {
      setValue("roundsSelected", []);
      return;
    }

    const desdeIndex = rounds.response.findIndex((r) => r.round === desde);
    const hastaIndex = rounds.response.findIndex((r) => r.round === hasta);

    if (desdeIndex === -1 || hastaIndex === -1 || desdeIndex > hastaIndex) {
      setValue("roundsSelected", []);
      return;
    }

    const selectedRoundsData = rounds.response
      .slice(desdeIndex, hastaIndex + 1)
      .map((round) => ({
        roundName: round.round,
        dates: round.dates,
      }));

    setValue("roundsSelected", selectedRoundsData);

    // Trigger validation when fields change
    if (desde && hasta) {
      trigger(["desde", "hasta"]);
    }
  }, [watch("desde"), watch("hasta"), rounds, setValue, trigger]);

  const handleLeagueChange = (value: string) => {
    const selectedLeague = LEAGUES.find(
      (league) => league.id.toString() === value,
    );
    if (selectedLeague) {
      setValue("league", selectedLeague.name);
      setValue("externalLeagueId", selectedLeague.id.toString());
    }
  };

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
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl space-y-6"
      >
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

            <div className="space-y-2">
              <Label htmlFor="league">Liga *</Label>
              <Select
                onValueChange={handleLeagueChange}
                defaultValue={quiniela.externalLeagueId?.toString()}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una liga" />
                </SelectTrigger>
                <SelectContent>
                  {LEAGUES.map((league) => (
                    <SelectItem key={league.id} value={league.id.toString()}>
                      {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.league && (
                <p className="text-sm text-destructive">
                  {errors.league.message}
                </p>
              )}
            </div>

            {/* Rounds Selection */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Selección de Jornadas</h3>
              {roundsLoading ? (
                <div className="flex items-center justify-center rounded-md border p-3">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Cargando jornadas...
                  </span>
                </div>
              ) : roundsError ? (
                <div className="rounded-md border border-destructive p-3">
                  <p className="text-sm text-destructive">
                    {roundsError?.message || "Error cargando jornadas"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="desde">Desde *</Label>
                    <Select
                      onValueChange={(value) => setValue("desde", value)}
                      defaultValue={firstRound}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona jornada inicial" />
                      </SelectTrigger>
                      <SelectContent>
                        {rounds?.response.map((round) => (
                          <SelectItem key={round.round} value={round.round}>
                            {round.round}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.desde && (
                      <p className="text-sm text-destructive">
                        {errors.desde.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hasta">Hasta *</Label>
                    <Select
                      onValueChange={(value) => setValue("hasta", value)}
                      defaultValue={lastRound}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona jornada final" />
                      </SelectTrigger>
                      <SelectContent>
                        {rounds?.response.map((round) => (
                          <SelectItem key={round.round} value={round.round}>
                            {round.round}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.hasta && (
                      <p className="text-sm text-destructive">
                        {errors.hasta.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {watch("desde") && watch("hasta") && (
                <p className="text-xs text-muted-foreground">
                  {watch("roundsSelected")?.length || 0} jornada(s)
                  seleccionada(s)
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
                  <Label htmlFor="prizeToWin">Premio Total a Ganar *</Label>
                  <div className="relative">
                    <Input
                      id="prizeToWin"
                      type="number"
                      {...register("prizeToWin", { valueAsNumber: true })}
                      placeholder="Ej: 1000"
                      className="w-full pl-8"
                      min={1}
                    />
                    <Trophy className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {errors.prizeToWin && (
                    <p className="text-sm text-destructive">
                      {errors.prizeToWin.message}
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

"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Loader2, Settings, FileText, Trophy, CheckCircle } from "lucide-react";
import { createQuiniela } from "@/app/quinielas/create-action";
import { Switch } from "@/components/ui/switch";

import PrizeDistributionForm from "./PrizeDistributionForm";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useRounds } from "@/hooks/api-football/useRounds";
import Image from "next/image";

const getLigaMXSeason = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month < 5 ? (year - 1).toString() : year.toString();
};

const CURRENT_SEASON = getLigaMXSeason();

// Zod schema for quiniela details
const createQuinielaSchema = z.object({
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
  moneyToEnter: z
    .number()
    .min(1, "El dinero de entrada debe ser mayor a 0")
    .int("El dinero de entrada debe ser un número entero"),
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
  externalSeason: z
    .string()
    .min(1, "La temporada es requerida")
    .default(CURRENT_SEASON),
});

export type CreateQuinielaFormData = z.infer<typeof createQuinielaSchema>;

export default function CreateQuinielaForm() {
  const leagueId = "262";

  const {
    data: rounds,
    isLoading: roundsLoading,
    error: roundsError,
  } = useRounds(leagueId, CURRENT_SEASON);

  // Filter future rounds only - rounds that haven't started yet
  // Unless NEXT_PUBLIC_ALLOW_ALL_ROUNDS is set to "true"
  const allowAllRounds =
    process.env.NEXT_PUBLIC_ALLOW_ALL_ROUNDS === "true";

  const futureRounds = useMemo(() => {
    if (!rounds?.response) return [];

    // If allowAllRounds is enabled, return all rounds without filtering
    if (allowAllRounds) {
      return rounds.response;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today

    return rounds.response.filter((round) => {
      // Check if the round hasn't started yet (earliest date is in the future)
      const earliestDate = round.dates
        .map((dateStr) => new Date(dateStr))
        .sort((a, b) => a.getTime() - b.getTime())[0];

      if (!earliestDate) return false;

      earliestDate.setHours(0, 0, 0, 0);
      return earliestDate >= today;
    });
  }, [rounds, allowAllRounds]);

  // Create dynamic schema with rounds validation
  const createQuinielaSchemaWithValidation = useMemo(() => {
    return createQuinielaSchema.refine(
      (data) => {
        if (!futureRounds.length || !data.desde || !data.hasta) {
          return true; // Skip validation if data not available
        }

        const desdeIndex = futureRounds.findIndex(
          (r) => r.round === data.desde,
        );
        const hastaIndex = futureRounds.findIndex(
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
  }, [futureRounds]);

  const form = useForm<CreateQuinielaFormData>({
    resolver: zodResolver(createQuinielaSchemaWithValidation),
    defaultValues: {
      name: "",
      description: "",
      league: "",
      externalLeagueId: "",
      moneyToEnter: 100,
      desde: "",
      hasta: "",
      roundsSelected: [],
      pointsForExactResultPrediction: 2,
      pointsForCorrectResultPrediction: 1,
      allowEditPredictions: true,
      prizeDistribution: [
        { position: 1, percentage: 50 },
        { position: 2, percentage: 30 },
        { position: 3, percentage: 20 },
      ],
    },
  });

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
    trigger,
  } = form;

  const allowEditPredictions = watch("allowEditPredictions");

  // Watch the form values
  const desde = watch("desde");
  const hasta = watch("hasta");

  // Convert desde/hasta selection to roundsSelected format
  useEffect(() => {
    if (!futureRounds.length || !desde || !hasta) {
      setValue("roundsSelected", []);
      return;
    }

    const desdeIndex = futureRounds.findIndex((r) => r.round === desde);
    const hastaIndex = futureRounds.findIndex((r) => r.round === hasta);

    if (desdeIndex === -1 || hastaIndex === -1 || desdeIndex > hastaIndex) {
      setValue("roundsSelected", []);
      return;
    }

    const selectedRoundsData = futureRounds
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
  }, [desde, hasta, futureRounds, setValue, trigger]);

  const onSubmit = async (data: CreateQuinielaFormData) => {
    try {
      const { quinielaId } = await createQuiniela(data);
      // Server action will handle the redirect, so we don't need client-side redirect
      toast({
        title: "¡Quiniela creada!",
        description: "Tu quiniela ha sido creada exitosamente.",
      });
      router.push("/quinielas");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al crear la quiniela",
        variant: "destructive",
      });
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* League Selection */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selecciona Liga</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                watch("league") === "Liga MX"
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
              }`}
              onClick={() => {
                setValue("league", "Liga MX");
                setValue("externalLeagueId", "262");
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                  <Image
                    src="https://media.api-sports.io/football/leagues/262.png"
                    alt="Liga MX"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Liga MX</h3>
                  <p className="text-sm text-muted-foreground">
                    Temporada {CURRENT_SEASON}
                  </p>
                </div>
                {watch("league") === "Liga MX" && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
            {errors.league && (
              <p className="mt-2 text-sm text-destructive">
                {errors.league.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quiniela Details Section */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
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
                placeholder="Describe los detalles de tu quiniela..."
                rows={3}
                className="resize-none border-border/50"
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Rounds Selection */}
            <div className="space-y-4 border-t border-border/50 pt-4">
              <div>
                <h3 className="font-medium">Selección de Jornadas</h3>
                <p className="text-xs text-muted-foreground">
                  Solo se muestran jornadas futuras disponibles para
                  predicciones.
                </p>
              </div>
              {roundsLoading ? (
                <div className="flex items-center justify-center rounded-lg border border-border/50 p-4">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Cargando jornadas...
                  </span>
                </div>
              ) : roundsError ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">
                    {roundsError?.message || "Error cargando jornadas"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="desde" className="text-sm">
                      Desde *
                    </Label>
                    <Select onValueChange={(value) => setValue("desde", value)}>
                      <SelectTrigger className="border-border/50">
                        <SelectValue placeholder="Jornada inicial" />
                      </SelectTrigger>
                      <SelectContent>
                        {futureRounds.map((round) => (
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
                    <Label htmlFor="hasta" className="text-sm">
                      Hasta *
                    </Label>
                    <Select onValueChange={(value) => setValue("hasta", value)}>
                      <SelectTrigger className="border-border/50">
                        <SelectValue placeholder="Jornada final" />
                      </SelectTrigger>
                      <SelectContent>
                        {futureRounds.map((round) => (
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
                <p className="text-xs text-primary">
                  ✓ {watch("roundsSelected")?.length || 0} jornada(s)
                  seleccionada(s)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quiniela Settings Section */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Ajustes de la Quiniela
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Prize Configuration */}
              <div className="space-y-2">
                <Label htmlFor="moneyToEnter">Precio de entrada *</Label>
                <div className="relative">
                  <Input
                    id="moneyToEnter"
                    type="number"
                    {...register("moneyToEnter", { valueAsNumber: true })}
                    placeholder="Ej: 100"
                    className="border-border/50 pl-7"
                    min={1}
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

              {/* Points Configuration */}
              <div className="space-y-4 border-t border-border/50 pt-4">
                <h3 className="font-medium">Configuración de Puntos</h3>
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
                      className="border-border/50"
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
                      className="border-border/50"
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
              <div className="flex items-start gap-4 border-t border-border/50 pt-4">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="allowEditPredictions">
                    Permitir Editar Predicciones
                  </Label>
                  <p className="text-xs text-muted-foreground">
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
                Creando Quiniela...
              </>
            ) : (
              "Crear Quiniela"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isSubmitting}
            className="h-11 border-border/50 sm:w-auto"
          >
            Limpiar
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

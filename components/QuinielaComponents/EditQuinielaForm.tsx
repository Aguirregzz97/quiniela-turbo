"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Settings,
  FileText,
  Trophy,
  Calendar,
  Info,
  Users,
} from "lucide-react";
import { updateQuiniela } from "@/app/quinielas/update-action";
import { Switch } from "@/components/ui/switch";

import PrizeDistributionForm from "./PrizeDistributionForm";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

// Prize distribution schema (reusable)
const prizeDistributionSchema = z
  .array(
    z.object({
      position: z.number(),
      percentage: z
        .number()
        .min(1, "El porcentaje debe ser mayor a 0")
        .max(100, "El porcentaje no puede exceder 100"),
    })
  )
  .min(1, "Debe haber al menos una posición de premio")
  .refine(
    (positions) => {
      const total = positions.reduce((sum, pos) => sum + pos.percentage, 0);
      return total === 100;
    },
    {
      message: "El total de porcentajes debe ser 100%",
    }
  )
  .refine(
    (positions) => {
      return !positions.some((pos) => pos.percentage === 0);
    },
    {
      message: "Todas las posiciones deben tener un porcentaje mayor a 0%",
    }
  );

// Zod schema for quiniela updates
const updateQuinielaSchema = z
  .object({
    name: z
      .string()
      .min(1, "El nombre es requerido")
      .max(100, "El nombre no puede exceder 100 caracteres"),
    description: z
      .string()
      .min(1, "La descripción es requerida")
      .max(500, "La descripción no puede exceder 500 caracteres"),
    pointsForExactResultPrediction: z
      .number()
      .min(1, "Mínimo 1 punto")
      .max(10, "Máximo 10 puntos"),
    pointsForCorrectResultPrediction: z
      .number()
      .min(1, "Mínimo 1 punto")
      .max(10, "Máximo 10 puntos"),
    // Game mode toggles
    playByTournament: z.boolean(),
    playByRound: z.boolean(),
    // Tournament-wide prize settings (optional based on playByTournament)
    moneyToEnter: z.number().int().optional().nullable(),
    prizeDistribution: prizeDistributionSchema.optional().nullable(),
    // Per-round prize settings (optional based on playByRound)
    moneyPerRoundToEnter: z.number().int().optional().nullable(),
    prizeDistributionPerRound: prizeDistributionSchema.optional().nullable(),
  })
  .refine(
    (data) => {
      // At least one game mode must be selected
      return data.playByTournament || data.playByRound;
    },
    {
      message: "Debes seleccionar al menos un modo de juego",
      path: ["playByTournament"],
    }
  )
  .refine(
    (data) => {
      // If playByTournament is enabled, moneyToEnter and prizeDistribution are required
      if (data.playByTournament) {
        return (
          data.moneyToEnter !== null &&
          data.moneyToEnter !== undefined &&
          data.moneyToEnter >= 1 &&
          data.prizeDistribution !== null &&
          data.prizeDistribution !== undefined &&
          data.prizeDistribution.length > 0
        );
      }
      return true;
    },
    {
      message:
        "El precio de entrada y distribución de premios son requeridos para el modo torneo",
      path: ["moneyToEnter"],
    }
  )
  .refine(
    (data) => {
      // If playByRound is enabled, moneyPerRoundToEnter and prizeDistributionPerRound are required
      if (data.playByRound) {
        return (
          data.moneyPerRoundToEnter !== null &&
          data.moneyPerRoundToEnter !== undefined &&
          data.moneyPerRoundToEnter >= 1 &&
          data.prizeDistributionPerRound !== null &&
          data.prizeDistributionPerRound !== undefined &&
          data.prizeDistributionPerRound.length > 0
        );
      }
      return true;
    },
    {
      message:
        "El precio de entrada y distribución de premios son requeridos para el modo por jornada",
      path: ["moneyPerRoundToEnter"],
    }
  );

export type UpdateQuinielaFormData = z.infer<typeof updateQuinielaSchema>;

interface EditQuinielaFormProps {
  quiniela: {
    id: string;
    name: string;
    description: string | null;
    moneyToEnter: number | null;
    prizeDistribution: { position: number; percentage: number }[] | null;
    moneyPerRoundToEnter: number | null;
    prizeDistributionPerRound: { position: number; percentage: number }[] | null;
    pointsForExactResultPrediction: number;
    pointsForCorrectResultPrediction: number;
  };
  participantCount: number;
  roundsCount: number;
}

export default function EditQuinielaForm({
  quiniela,
  participantCount,
  roundsCount,
}: EditQuinielaFormProps) {
  const router = useRouter();

  // Determine initial game modes based on existing data
  const initialPlayByTournament = !!(
    quiniela.moneyToEnter && quiniela.prizeDistribution
  );
  const initialPlayByRound = !!(
    quiniela.moneyPerRoundToEnter && quiniela.prizeDistributionPerRound
  );

  const form = useForm<UpdateQuinielaFormData>({
    resolver: zodResolver(updateQuinielaSchema),
    defaultValues: {
      name: quiniela.name,
      description: quiniela.description || "",
      pointsForExactResultPrediction: quiniela.pointsForExactResultPrediction,
      pointsForCorrectResultPrediction: quiniela.pointsForCorrectResultPrediction,
      // Game mode toggles
      playByTournament: initialPlayByTournament,
      playByRound: initialPlayByRound,
      // Tournament-wide settings
      moneyToEnter: quiniela.moneyToEnter,
      prizeDistribution: quiniela.prizeDistribution,
      // Per-round settings
      moneyPerRoundToEnter: quiniela.moneyPerRoundToEnter,
      prizeDistributionPerRound: quiniela.prizeDistributionPerRound,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = form;

  const playByTournament = watch("playByTournament");
  const playByRound = watch("playByRound");
  const moneyToEnter = watch("moneyToEnter");
  const prizeDistribution = watch("prizeDistribution");
  const moneyPerRoundToEnter = watch("moneyPerRoundToEnter");
  const prizeDistributionPerRound = watch("prizeDistributionPerRound");

  // Helper function to check if prize distribution is valid (totals 100%)
  const isPrizeDistributionValid = (
    distribution: { position: number; percentage: number }[] | null | undefined
  ): boolean => {
    if (!distribution || distribution.length === 0) return false;
    const total = distribution.reduce((sum, pos) => sum + pos.percentage, 0);
    return total === 100 && !distribution.some((pos) => pos.percentage === 0);
  };

  // Calculate example prizes using actual participant count
  const examplePlayers = participantCount > 0 ? participantCount : 5;

  const tournamentPrizeExample = useMemo(() => {
    if (
      !moneyToEnter ||
      !prizeDistribution ||
      !isPrizeDistributionValid(prizeDistribution)
    )
      return null;
    const totalPool = moneyToEnter * examplePlayers;
    return {
      totalPool,
      prizes: prizeDistribution.map((pos) => ({
        position: pos.position,
        amount: Math.round((totalPool * pos.percentage) / 100),
        percentage: pos.percentage,
      })),
    };
  }, [moneyToEnter, prizeDistribution, examplePlayers]);

  const roundPrizeExample = useMemo(() => {
    if (
      !moneyPerRoundToEnter ||
      !prizeDistributionPerRound ||
      !isPrizeDistributionValid(prizeDistributionPerRound)
    )
      return null;
    const totalPoolPerRound = moneyPerRoundToEnter * examplePlayers;
    const numRounds = roundsCount || 1;
    return {
      totalPoolPerRound,
      numRounds,
      totalAllRounds: totalPoolPerRound * numRounds,
      prizes: prizeDistributionPerRound.map((pos) => ({
        position: pos.position,
        amount: Math.round((totalPoolPerRound * pos.percentage) / 100),
        percentage: pos.percentage,
      })),
    };
  }, [moneyPerRoundToEnter, prizeDistributionPerRound, examplePlayers, roundsCount]);

  // Initialize prize distributions when toggles are enabled
  const handleTournamentToggle = (checked: boolean) => {
    setValue("playByTournament", checked);
    if (checked && !prizeDistribution) {
      setValue("prizeDistribution", [
        { position: 1, percentage: 50 },
        { position: 2, percentage: 30 },
        { position: 3, percentage: 20 },
      ]);
      setValue("moneyToEnter", 100);
    }
    if (!checked) {
      setValue("moneyToEnter", null);
      setValue("prizeDistribution", null);
    }
  };

  const handleRoundToggle = (checked: boolean) => {
    setValue("playByRound", checked);
    if (checked && !prizeDistributionPerRound) {
      setValue("prizeDistributionPerRound", [{ position: 1, percentage: 100 }]);
      setValue("moneyPerRoundToEnter", 50);
    }
    if (!checked) {
      setValue("moneyPerRoundToEnter", null);
      setValue("prizeDistributionPerRound", null);
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                <p className="text-sm text-destructive">{errors.name.message}</p>
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
          </CardContent>
        </Card>

        {/* Points Configuration */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Configuración de Puntos
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Game Mode Selection */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              Modos de Juego y Premios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div className="text-sm">
                <p className="mb-1 font-medium text-primary">
                  Puedes activar ambos modos a la vez
                </p>
                <p className="text-muted-foreground">
                  Si activas ambos, los participantes competirán por premios de
                  jornada y también por el premio del torneo completo. Cada modo
                  tiene su propio precio de entrada y distribución de premios.
                </p>
              </div>
            </div>

            {/* Error for no mode selected */}
            {errors.playByTournament && !playByTournament && !playByRound && (
              <p className="text-sm text-destructive">
                {errors.playByTournament.message}
              </p>
            )}

            {/* Play by Tournament Toggle */}
            <div className="space-y-4">
              <div
                className={`rounded-xl border-2 p-4 transition-all ${
                  playByTournament
                    ? "border-primary bg-primary/5"
                    : "border-border/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <Label
                        htmlFor="playByTournament"
                        className="cursor-pointer text-base font-semibold"
                      >
                        Jugar por Torneo Completo
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Un solo ganador al final del torneo basado en puntos
                      acumulados de todas las jornadas
                    </p>
                  </div>
                  <Switch
                    id="playByTournament"
                    checked={playByTournament}
                    onCheckedChange={handleTournamentToggle}
                  />
                </div>

                {/* Tournament Prize Settings */}
                {playByTournament && (
                  <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="moneyToEnter">
                        Precio de entrada para premio de torneo *
                      </Label>
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

                    <div>
                      <PrizeDistributionForm name="prizeDistribution" />
                    </div>

                    {/* Tournament Prize Example */}
                    {tournamentPrizeExample && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            {participantCount > 0
                              ? `Con ${examplePlayers} participantes actuales`
                              : `Ejemplo con ${examplePlayers} jugadores`}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Bolsa total del torneo:
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-green-500/10 text-green-700 dark:text-green-400"
                            >
                              ${tournamentPrizeExample.totalPool.toLocaleString()}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 border-t border-border/50 pt-2">
                            {tournamentPrizeExample.prizes.map((prize) => (
                              <div
                                key={prize.position}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {prize.position}° lugar ({prize.percentage}%):
                                </span>
                                <span className="font-medium">
                                  ${prize.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Play by Round Toggle */}
            <div className="space-y-4">
              <div
                className={`rounded-xl border-2 p-4 transition-all ${
                  playByRound
                    ? "border-primary bg-primary/5"
                    : "border-border/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <Label
                        htmlFor="playByRound"
                        className="cursor-pointer text-base font-semibold"
                      >
                        Jugar por Jornada
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Un ganador por cada jornada basado en los puntos de esa
                      jornada específica
                    </p>
                  </div>
                  <Switch
                    id="playByRound"
                    checked={playByRound}
                    onCheckedChange={handleRoundToggle}
                  />
                </div>

                {/* Per-Round Prize Settings */}
                {playByRound && (
                  <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="moneyPerRoundToEnter">
                        Precio de entrada por jornada *
                      </Label>
                      <div className="relative">
                        <Input
                          id="moneyPerRoundToEnter"
                          type="number"
                          {...register("moneyPerRoundToEnter", {
                            valueAsNumber: true,
                          })}
                          placeholder="Ej: 50"
                          className="border-border/50 pl-7"
                          min={1}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                      </div>
                      {errors.moneyPerRoundToEnter && (
                        <p className="text-sm text-destructive">
                          {errors.moneyPerRoundToEnter.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <PrizeDistributionForm name="prizeDistributionPerRound" />
                    </div>

                    {/* Round Prize Example */}
                    {roundPrizeExample && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            {participantCount > 0
                              ? `Con ${examplePlayers} participantes actuales`
                              : `Ejemplo con ${examplePlayers} jugadores`}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Bolsa por jornada:
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-green-500/10 text-green-700 dark:text-green-400"
                            >
                              ${roundPrizeExample.totalPoolPerRound.toLocaleString()}
                            </Badge>
                          </div>
                          {roundPrizeExample.numRounds > 1 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Total en {roundPrizeExample.numRounds} jornadas:
                              </span>
                              <Badge
                                variant="secondary"
                                className="bg-green-500/10 text-green-700 dark:text-green-400"
                              >
                                ${roundPrizeExample.totalAllRounds.toLocaleString()}
                              </Badge>
                            </div>
                          )}
                          <div className="space-y-1.5 border-t border-border/50 pt-2">
                            <p className="mb-1 text-xs text-muted-foreground">
                              Premio por jornada:
                            </p>
                            {roundPrizeExample.prizes.map((prize) => (
                              <div
                                key={prize.position}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {prize.position}° lugar ({prize.percentage}%):
                                </span>
                                <span className="font-medium">
                                  ${prize.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
            className="h-11 border-border/50 sm:w-auto"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

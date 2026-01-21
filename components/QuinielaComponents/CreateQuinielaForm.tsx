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
import {
  Loader2,
  Settings,
  FileText,
  Trophy,
  CheckCircle,
  Calendar,
  Info,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

// Zod schema for quiniela details
const createQuinielaSchema = z
  .object({
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
    desde: z.string().min(1, "Debe seleccionar una jornada de inicio"),
    hasta: z.string().min(1, "Debe seleccionar una jornada de fin"),
    roundsSelected: z
      .array(
        z.object({
          roundName: z.string(),
          dates: z.array(z.string()),
        })
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
    // Game mode toggles
    playByTournament: z.boolean(),
    playByRound: z.boolean(),
    // Tournament-wide prize settings (optional based on playByTournament)
    moneyToEnter: z.number().int().optional().nullable(),
    prizeDistribution: prizeDistributionSchema.optional().nullable(),
    // Per-round prize settings (optional based on playByRound)
    moneyPerRoundToEnter: z.number().int().optional().nullable(),
    prizeDistributionPerRound: prizeDistributionSchema.optional().nullable(),
    externalSeason: z
      .string()
      .min(1, "La temporada es requerida")
      .default(CURRENT_SEASON),
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
  const allowAllRounds = process.env.NEXT_PUBLIC_ALLOW_ALL_ROUNDS === "true";

  const futureRounds = useMemo(() => {
    if (!rounds?.response) return [];

    // If allowAllRounds is enabled, return all rounds without filtering
    if (allowAllRounds) {
      return rounds.response;
    }

    // Get today's date in Mexico City timezone
    const now = new Date();
    const mexicoCityDate = now.toLocaleDateString("en-CA", {
      timeZone: "America/Mexico_City",
    }); // Returns YYYY-MM-DD format
    const today = new Date(mexicoCityDate + "T00:00:00");

    return rounds.response.filter((round) => {
      // Check if the round hasn't started yet (earliest date is in the future)
      // round.dates are in YYYY-MM-DD format (Mexico City dates from API)
      const sortedDates = [...round.dates].sort();
      const earliestDateStr = sortedDates[0];

      if (!earliestDateStr) return false;

      const earliestDate = new Date(earliestDateStr + "T00:00:00");
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

        const desdeIndex = futureRounds.findIndex((r) => r.round === data.desde);
        const hastaIndex = futureRounds.findIndex((r) => r.round === data.hasta);

        return desdeIndex <= hastaIndex;
      },
      {
        message:
          "La jornada 'desde' debe ser anterior o igual a la jornada 'hasta'",
        path: ["hasta"],
      }
    );
  }, [futureRounds]);

  const form = useForm<CreateQuinielaFormData>({
    resolver: zodResolver(createQuinielaSchemaWithValidation),
    defaultValues: {
      name: "",
      description: "",
      league: "",
      externalLeagueId: "",
      desde: "",
      hasta: "",
      roundsSelected: [],
      pointsForExactResultPrediction: 2,
      pointsForCorrectResultPrediction: 1,
      // Game mode toggles - default both off
      playByTournament: false,
      playByRound: false,
      // Tournament-wide settings
      moneyToEnter: null,
      prizeDistribution: null,
      // Per-round settings
      moneyPerRoundToEnter: null,
      prizeDistributionPerRound: null,
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

  const playByTournament = watch("playByTournament");
  const playByRound = watch("playByRound");
  const moneyToEnter = watch("moneyToEnter");
  const prizeDistribution = watch("prizeDistribution");
  const moneyPerRoundToEnter = watch("moneyPerRoundToEnter");
  const prizeDistributionPerRound = watch("prizeDistributionPerRound");
  const roundsSelected = watch("roundsSelected");

  // Watch the form values
  const desde = watch("desde");
  const hasta = watch("hasta");

  // Helper function to check if prize distribution is valid (totals 100%)
  const isPrizeDistributionValid = (
    distribution: { position: number; percentage: number }[] | null | undefined
  ): boolean => {
    if (!distribution || distribution.length === 0) return false;
    const total = distribution.reduce((sum, pos) => sum + pos.percentage, 0);
    return total === 100 && !distribution.some((pos) => pos.percentage === 0);
  };

  // Calculate example prizes
  const EXAMPLE_PLAYERS = 5;

  const tournamentPrizeExample = useMemo(() => {
    if (
      !moneyToEnter ||
      !prizeDistribution ||
      !isPrizeDistributionValid(prizeDistribution)
    )
      return null;
    const totalPool = moneyToEnter * EXAMPLE_PLAYERS;
    return {
      totalPool,
      prizes: prizeDistribution.map((pos) => ({
        position: pos.position,
        amount: Math.round((totalPool * pos.percentage) / 100),
        percentage: pos.percentage,
      })),
    };
  }, [moneyToEnter, prizeDistribution]);

  const roundPrizeExample = useMemo(() => {
    if (
      !moneyPerRoundToEnter ||
      !prizeDistributionPerRound ||
      !isPrizeDistributionValid(prizeDistributionPerRound)
    )
      return null;
    const totalPoolPerRound = moneyPerRoundToEnter * EXAMPLE_PLAYERS;
    const numRounds = roundsSelected?.length || 1;
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
  }, [moneyPerRoundToEnter, prizeDistributionPerRound, roundsSelected]);

  // Initialize prize distributions when toggles are enabled
  useEffect(() => {
    if (playByTournament && !watch("prizeDistribution")) {
      setValue("prizeDistribution", [
        { position: 1, percentage: 50 },
        { position: 2, percentage: 30 },
        { position: 3, percentage: 20 },
      ]);
      setValue("moneyToEnter", 100);
    }
  }, [playByTournament, setValue, watch]);

  useEffect(() => {
    if (playByRound && !watch("prizeDistributionPerRound")) {
      setValue("prizeDistributionPerRound", [{ position: 1, percentage: 100 }]);
      setValue("moneyPerRoundToEnter", 50);
    }
  }, [playByRound, setValue, watch]);

  // Clear values when toggles are disabled
  useEffect(() => {
    if (!playByTournament) {
      setValue("moneyToEnter", null);
      setValue("prizeDistribution", null);
    }
  }, [playByTournament, setValue]);

  useEffect(() => {
    if (!playByRound) {
      setValue("moneyPerRoundToEnter", null);
      setValue("prizeDistributionPerRound", null);
    }
  }, [playByRound, setValue]);

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

            {/* Rounds Selection */}
            <div className="space-y-4 border-t border-border/50 pt-4">
              <div>
                <h3 className="font-medium">Selección de Jornadas</h3>
                <p className="text-xs text-muted-foreground">
                  Solo se muestran jornadas futuras disponibles para predicciones.
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
            <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-4 border border-primary/20">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary mb-1">
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
                        className="text-base font-semibold cursor-pointer"
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
                    onCheckedChange={(checked) =>
                      setValue("playByTournament", checked)
                    }
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
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            Ejemplo con {EXAMPLE_PLAYERS} jugadores
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
                          <div className="border-t border-border/50 pt-2 space-y-1.5">
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
                        className="text-base font-semibold cursor-pointer"
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
                    onCheckedChange={(checked) =>
                      setValue("playByRound", checked)
                    }
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
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            Ejemplo con {EXAMPLE_PLAYERS} jugadores
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
                          <div className="border-t border-border/50 pt-2 space-y-1.5">
                            <p className="text-xs text-muted-foreground mb-1">
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

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, DollarSign, AlertTriangle } from "lucide-react";
import { useFormContext, Controller } from "react-hook-form";

interface PrizePosition {
  position: number;
  percentage: number;
}

interface PrizeDistributionFormProps {
  name: string;
  label?: string;
}

export default function PrizeDistributionForm({
  name,
  label = "Distribución de Premios",
}: PrizeDistributionFormProps) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();
  const [positions, setPositions] = useState<PrizePosition[]>([
    { position: 1, percentage: 50 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 20 },
  ]);

  const watchedValue = watch(name);

  // Update positions when form value changes
  useEffect(() => {
    if (watchedValue && Array.isArray(watchedValue)) {
      setPositions(watchedValue);
    }
  }, [watchedValue, name]);

  const addPosition = () => {
    const newPosition = positions.length + 1;
    const newPositions = [
      ...positions,
      { position: newPosition, percentage: 0 },
    ];
    setPositions(newPositions);
    setValue(name, newPositions);
  };

  const removePosition = (index: number) => {
    if (positions.length <= 1) return; // Keep at least one position

    const newPositions = positions
      .filter((_, i) => i !== index)
      .map((pos, i) => ({ ...pos, position: i + 1 })); // Recalculate positions

    setPositions(newPositions);
    setValue(name, newPositions);
  };

  const updatePercentage = (index: number, percentage: number) => {
    const newPositions = positions.map((pos, i) =>
      i === index ? { ...pos, percentage } : pos,
    );
    setPositions(newPositions);
    setValue(name, newPositions);
  };

  const handlePercentageChange = (index: number, value: string) => {
    const percentage = value === "" ? 0 : Number(value);
    updatePercentage(index, percentage);
  };

  const hasZeroPercentages = positions.some((pos) => pos.percentage === 0);
  const hasInvalidPercentages = positions.some(
    (pos) => pos.percentage < 0 || pos.percentage > 100,
  );

  const totalPercentage = positions.reduce(
    (sum, pos) => sum + pos.percentage,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="text-base font-medium">Posiciones de Premio</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura cómo se distribuirán los premios entre los ganadores
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPosition}
          className="sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Posición
        </Button>
      </div>

      <div className="space-y-3">
        {positions.map((pos, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center"
          >
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {pos.position}
              </div>
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor={`percentage-${index}`}
                  className="text-sm font-medium"
                >
                  Porcentaje del Premio
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id={`percentage-${index}`}
                    type="number"
                    min={1}
                    max={100}
                    value={pos.percentage || ""}
                    onChange={(e) =>
                      handlePercentageChange(index, e.target.value)
                    }
                    className="w-20 sm:w-24"
                    placeholder="0"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            {positions.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removePosition(index)}
                className="sm:w-auto"
              >
                <Minus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {totalPercentage !== 100 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            El total debe ser 100%. Actual: {totalPercentage}%
          </span>
        </div>
      )}

      {hasZeroPercentages && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-800 dark:text-red-200">
            Todas las posiciones deben tener un porcentaje mayor a 0%
          </span>
        </div>
      )}

      {hasInvalidPercentages && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-800 dark:text-red-200">
            Los porcentajes deben estar entre 1% y 100%
          </span>
        </div>
      )}
    </div>
  );
}

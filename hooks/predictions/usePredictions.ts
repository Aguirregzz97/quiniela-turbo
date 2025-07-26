"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface ExistingPrediction {
  id: string;
  externalFixtureId: string;
  externalRound: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
}

async function fetchUserPredictions(
  quinielaId: string,
): Promise<ExistingPrediction[]> {
  const response = await axios.get(`/api/quinielas/${quinielaId}/predictions`);
  return response.data;
}

export function usePredictions(quinielaId: string) {
  return useQuery({
    queryKey: ["predictions", quinielaId],
    queryFn: () => fetchUserPredictions(quinielaId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!quinielaId,
  });
}

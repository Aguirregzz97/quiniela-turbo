"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface AllPredictionsData {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  externalFixtureId: string;
  externalRound: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchAllPredictions(
  quinielaId: string,
): Promise<AllPredictionsData[]> {
  const response = await axios.get(
    `/api/quinielas/${quinielaId}/all-predictions`,
  );
  return response.data;
}

export function useAllPredictions(quinielaId: string) {
  return useQuery({
    queryKey: ["all-predictions", quinielaId],
    queryFn: () => fetchAllPredictions(quinielaId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!quinielaId,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { SurvivorStatisticsResponse } from "@/app/api/user/survivor-statistics/route";

async function fetchSurvivorStatistics(): Promise<SurvivorStatisticsResponse> {
  const response = await fetch("/api/user/survivor-statistics");
  if (!response.ok) {
    throw new Error("Failed to fetch survivor statistics");
  }
  return response.json();
}

export function useSurvivorStatistics() {
  return useQuery({
    queryKey: ["survivor-statistics"],
    queryFn: fetchSurvivorStatistics,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}


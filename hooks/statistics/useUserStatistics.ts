"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { UserStatisticsResponse } from "@/app/api/user/statistics/route";

async function fetchUserStatistics(): Promise<UserStatisticsResponse> {
  const response = await axios.get("/api/user/statistics");
  return response.data;
}

export function useUserStatistics() {
  return useQuery({
    queryKey: ["user-statistics"],
    queryFn: fetchUserStatistics,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

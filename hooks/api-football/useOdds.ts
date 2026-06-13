import { useQuery } from "@tanstack/react-query";
import { OddsApiResponse } from "@/types/odds";
import axios, { AxiosError } from "axios";

async function fetchOdds(fixtureId: number): Promise<OddsApiResponse> {
  try {
    const response = await axios.get("/api/football/odds", {
      params: { fixture: fixtureId },
    });
    return response.data as OddsApiResponse;
  } catch (error) {
    // The route returns 429 with the api-football body when api-football
    // is rate-limiting us. axios throws on 429 by default. Re-throw with
    // a marker so React Query knows not to retry aggressively and so the
    // UI can render a rate-limit-specific message.
    if (error instanceof AxiosError && error.response?.status === 429) {
      const wrapped = new Error("api-football rate limit");
      (wrapped as Error & { isRateLimit?: boolean }).isRateLimit = true;
      throw wrapped;
    }
    throw error;
  }
}

interface UseOddsOptions {
  /**
   * When false, the query is held back from firing. Used by the
   * `OddsDrawer` to defer the upstream call until the user actually
   * opens the drawer — staying friendly to api-football's 300/min cap.
   */
  enabled?: boolean;
}

export function useOdds(
  fixtureId: number | undefined,
  options?: UseOddsOptions,
) {
  const enabled = (options?.enabled ?? true) && Boolean(fixtureId);

  return useQuery({
    queryKey: ["odds", fixtureId],
    queryFn: () => fetchOdds(fixtureId!),
    // 30 min in TanStack Query's cache mirrors the server-side Redis
    // TTL, so once a user opens the drawer for a fixture we won't
    // re-fetch it for the rest of the session.
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry rate-limit errors — the cap is per-minute, so any
      // immediate retry would fail too. The user can hit "Reintentar"
      // in the drawer once the next minute boundary rolls over.
      if ((error as { isRateLimit?: boolean })?.isRateLimit) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled,
  });
}

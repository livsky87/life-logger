"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApiObservationsForLocation } from "@/infrastructure/api/apiObservationApi";

export function apiObservationsQueryKey(locationId: string, startIso: string, endIso: string) {
  return ["api-observations", locationId, startIso, endIso] as const;
}

export function useApiObservationsForLocation(
  locationId: string | undefined,
  startIso: string,
  endIso: string,
  refetchIntervalMs: number | false = 60_000,
) {
  return useQuery({
    queryKey: locationId ? apiObservationsQueryKey(locationId, startIso, endIso) : ["api-observations", "skip"],
    queryFn: () => fetchApiObservationsForLocation(startIso, endIso, locationId!),
    enabled: !!locationId && !!startIso && !!endIso,
    staleTime: 15_000,
    refetchInterval: refetchIntervalMs,
  });
}

export function useInvalidateApiObservations() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["api-observations"] });
}

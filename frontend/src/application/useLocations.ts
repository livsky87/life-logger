"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLocations } from "@/infrastructure/api/locationApi";

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
    staleTime: 5 * 60_000,
  });
}

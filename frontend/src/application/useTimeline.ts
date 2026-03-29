"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTimeline } from "@/infrastructure/api/lifeLogApi";

export function useTimeline(start: string, end: string, locationIds: string[]) {
  return useQuery({
    queryKey: ["timeline", start, end, locationIds],
    queryFn: () => fetchTimeline(start, end, locationIds),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

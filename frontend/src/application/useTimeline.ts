"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTimeline } from "@/infrastructure/api/lifeLogApi";

export function useTimeline(date: string, locationIds: string[]) {
  return useQuery({
    queryKey: ["timeline", date, locationIds],
    queryFn: () => fetchTimeline(date, locationIds),
    staleTime: 30_000,
    refetchInterval: 60_000, // auto-refresh every minute for near-realtime feel
  });
}

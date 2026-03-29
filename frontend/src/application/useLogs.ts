"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLogs } from "@/infrastructure/api/lifeLogApi";

export function useLogs(opts: {
  user_id?: string;
  location_id?: string;
  category?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["logs", opts],
    queryFn: () => fetchLogs(opts),
    staleTime: 10_000,
  });
}

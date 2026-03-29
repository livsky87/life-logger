"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "@/infrastructure/api/userApi";

export function useUsers(locationId?: string) {
  return useQuery({
    queryKey: ["users", locationId ?? "all"],
    queryFn: () => fetchUsers(locationId),
    staleTime: 60_000,
  });
}

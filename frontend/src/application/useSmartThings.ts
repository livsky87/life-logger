"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHomePresenceStatus } from "@/infrastructure/api/homePresenceApi";
import { fetchSmartThingsDevices } from "@/infrastructure/api/smartthingsApi";

export function useSmartThingsDevices() {
  return useQuery({
    queryKey: ["smartthings", "devices"],
    queryFn: fetchSmartThingsDevices,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useHomePresenceStatus() {
  return useQuery({
    queryKey: ["home-presence", "status"],
    queryFn: fetchHomePresenceStatus,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: false,
  });
}

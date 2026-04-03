import type { HomePresenceStatus } from "@/domain/simulationTypes";
import { apiFetch } from "./client";

export async function fetchHomePresenceStatus(): Promise<HomePresenceStatus> {
  return apiFetch<HomePresenceStatus>("/api/v1/proxy/home-presence/status");
}

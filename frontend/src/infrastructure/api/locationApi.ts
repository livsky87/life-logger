import type { Location } from "@/domain/types";
import { apiFetch } from "./client";

export function fetchLocations(): Promise<Location[]> {
  return apiFetch<Location[]>("/api/v1/locations");
}

export function createLocation(body: {
  location_code?: string;
  name: string;
  timezone: string;
  description?: string;
}): Promise<Location> {
  return apiFetch<Location>("/api/v1/locations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

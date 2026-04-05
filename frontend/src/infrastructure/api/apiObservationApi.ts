import type { ApiObservation, ApiObservationBatchCreate } from "@/domain/apiObservationTypes";
import { apiFetch } from "./client";

export async function fetchApiObservationsForLocation(
  startIso: string,
  endIso: string,
  locationId: string,
): Promise<ApiObservation[]> {
  const q = new URLSearchParams({
    start: startIso,
    end: endIso,
    location_id: locationId,
  });
  return apiFetch<ApiObservation[]>(`/api/v1/api-observations?${q}`);
}

export async function createApiObservationsBatch(
  body: ApiObservationBatchCreate,
): Promise<ApiObservation[]> {
  return apiFetch<ApiObservation[]>("/api/v1/api-observations/batch", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

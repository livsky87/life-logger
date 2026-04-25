export type ApiObservationOutcome = "success" | "warning" | "failure";

export interface ApiObservation {
  id: number;
  observed_at: string;
  method: string;
  detail: string;
  /** Optional confidence/probability from backend payload (0..1 expected). */
  probability?: number | null;
  http_status: number | null;
  outcome: ApiObservationOutcome;
  description: string;
  location_id: string | null;
  user_id: string | null;
  created_at: string;
}

export interface ApiObservationCreate {
  observed_at: string;
  method?: string;
  detail: string;
  http_status?: number | null;
  outcome: ApiObservationOutcome;
  description?: string;
  location_id?: string | null;
  user_id?: string | null;
}

export interface ApiObservationBatchCreate {
  items: ApiObservationCreate[];
}

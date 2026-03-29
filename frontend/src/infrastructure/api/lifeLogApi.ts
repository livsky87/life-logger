import type { Category, LifeLog, TimelineResponse } from "@/domain/types";
import { apiFetch } from "./client";

export function fetchTimeline(date: string, locationIds: string[]): Promise<TimelineResponse> {
  const params = new URLSearchParams({ date });
  locationIds.forEach((id) => params.append("location_id", id));
  return apiFetch<TimelineResponse>(`/api/v1/life-logs/timeline?${params}`);
}

export function fetchLogs(opts: {
  user_id?: string;
  location_id?: string;
  category?: string;
  limit?: number;
  cursor?: number;
}): Promise<LifeLog[]> {
  const params = new URLSearchParams();
  if (opts.user_id) params.set("user_id", opts.user_id);
  if (opts.location_id) params.set("location_id", opts.location_id);
  if (opts.category) params.set("category", opts.category);
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", String(opts.cursor));
  return apiFetch<LifeLog[]>(`/api/v1/life-logs?${params}`);
}

export function createLifeLog(body: {
  user_id: string;
  location_id: string;
  category: Category;
  event_type: string;
  started_at: string;
  ended_at?: string | null;
  data?: Record<string, unknown>;
}): Promise<LifeLog> {
  return apiFetch<LifeLog>("/api/v1/life-logs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function endLifeLog(logId: number, endedAt: string): Promise<LifeLog> {
  return apiFetch<LifeLog>(`/api/v1/life-logs/${logId}/end`, {
    method: "PATCH",
    body: JSON.stringify({ ended_at: endedAt }),
  });
}

export function deleteLifeLog(logId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/life-logs/${logId}`, { method: "DELETE" });
}

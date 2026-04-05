import type { Schedule, ScheduleBatchCreate, ScheduleBatchResult, ScheduleCreate, ScheduleTimelineResponse, ScheduleUpdate } from "@/domain/scheduleTypes";
import { apiFetch } from "./client";

export async function fetchSchedules(date: number, userId?: string | null): Promise<Schedule[]> {
  let url = `/api/v1/schedules?date=${date}`;
  if (userId) url += `&user_id=${userId}`;
  return apiFetch<Schedule[]>(url);
}

export async function createSchedule(body: ScheduleCreate): Promise<Schedule> {
  return apiFetch<Schedule>("/api/v1/schedules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSchedule(id: number, body: ScheduleUpdate): Promise<Schedule> {
  return apiFetch<Schedule>(`/api/v1/schedules/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteSchedule(id: number): Promise<void> {
  await apiFetch<void>(`/api/v1/schedules/${id}`, { method: "DELETE" });
}

export async function batchUploadSchedules(body: ScheduleBatchCreate): Promise<ScheduleBatchResult> {
  return apiFetch<ScheduleBatchResult>("/api/v1/schedules/batch", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteDaySchedules(userId: string, date: number): Promise<{ deleted: number }> {
  return apiFetch<{ deleted: number }>(
    `/api/v1/schedules/day?user_id=${userId}&date=${date}`,
    { method: "DELETE" },
  );
}

export async function fetchScheduleTimeline(date: number, days = 1, locationId?: string): Promise<ScheduleTimelineResponse> {
  let url = `/api/v1/schedules/timeline?date=${date}&days=${days}`;
  if (locationId) url += `&location_id=${locationId}`;
  return apiFetch<ScheduleTimelineResponse>(url);
}

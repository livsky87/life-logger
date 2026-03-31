import type { Schedule, ScheduleCreate, ScheduleUpdate } from "@/domain/scheduleTypes";
import { apiFetch } from "./client";

export async function fetchSchedules(date: number, userId?: string | null): Promise<Schedule[]> {
  let url = `/api/v1/schedules?date=${date}`;
  if (userId) url += `&user_id=${userId}`;
  return apiFetch<Schedule[]>(url);
}

export async function fetchSchedule(id: number): Promise<Schedule> {
  return apiFetch<Schedule>(`/api/v1/schedules/${id}`);
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

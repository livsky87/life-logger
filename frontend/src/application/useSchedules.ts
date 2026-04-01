"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  updateSchedule,
} from "@/infrastructure/api/scheduleApi";
import type { ScheduleCreate, ScheduleUpdate } from "@/domain/scheduleTypes";

/**
 * Fetch schedules for a given date, optionally filtered by userId.
 * Pass date=0 to disable the query.
 */
export function useSchedules(date: number, userId?: string | null) {
  return useQuery({
    queryKey: ["schedules", date, userId ?? null],
    queryFn: () => fetchSchedules(date, userId),
    staleTime: 30_000,
    enabled: !!date,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ScheduleCreate) => createSchedule(body),
    onSuccess: (data) => {
      // Invalidate for all user combinations for this date
      qc.invalidateQueries({ queryKey: ["schedules", data.date] });
    },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ScheduleUpdate }) =>
      updateSchedule(id, body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["schedules", data.date] });
    },
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: number; date: number }) =>
      deleteSchedule(id).then(() => date),
    onSuccess: (date) => {
      qc.invalidateQueries({ queryKey: ["schedules", date] });
    },
  });
}

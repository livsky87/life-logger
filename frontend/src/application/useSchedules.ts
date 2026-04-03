"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  batchUploadSchedules,
  createSchedule,
  deleteSchedule,
  deleteDaySchedules,
  fetchSchedules,
  fetchScheduleTimeline,
  updateSchedule,
} from "@/infrastructure/api/scheduleApi";
import type { ScheduleBatchCreate, ScheduleCreate, ScheduleUpdate } from "@/domain/scheduleTypes";

export function useSchedules(date: number, userId?: string | null) {
  return useQuery({
    queryKey: ["schedules", date, userId ?? null],
    queryFn: () => fetchSchedules(date, userId),
    staleTime: 30_000,
    enabled: !!date,
  });
}

export function useScheduleTimeline(date: number, locationId?: string) {
  return useQuery({
    queryKey: ["schedule-timeline", date, locationId ?? null],
    queryFn: () => fetchScheduleTimeline(date, locationId),
    staleTime: 30_000,
    enabled: !!date,
  });
}

function dtToDateInt(datetime: string): number {
  const d = new Date(datetime);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return (
    kst.getUTCFullYear() * 10000 +
    (kst.getUTCMonth() + 1) * 100 +
    kst.getUTCDate()
  );
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ScheduleCreate) => createSchedule(body),
    onSuccess: (data) => {
      const date = dtToDateInt(data.datetime);
      qc.invalidateQueries({ queryKey: ["schedules", date] });
      qc.invalidateQueries({ queryKey: ["schedule-timeline", date] });
    },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ScheduleUpdate }) =>
      updateSchedule(id, body),
    onSuccess: (data) => {
      const date = dtToDateInt(data.datetime);
      qc.invalidateQueries({ queryKey: ["schedules", date] });
      qc.invalidateQueries({ queryKey: ["schedule-timeline", date] });
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
      qc.invalidateQueries({ queryKey: ["schedule-timeline", date] });
    },
  });
}

export function useBatchUploadSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ScheduleBatchCreate) => batchUploadSchedules(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["schedules", data.date] });
      qc.invalidateQueries({ queryKey: ["schedule-timeline", data.date] });
    },
  });
}

export function useDeleteDaySchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, date }: { userId: string; date: number }) =>
      deleteDaySchedules(userId, date),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["schedules", vars.date] });
      qc.invalidateQueries({ queryKey: ["schedule-timeline", vars.date] });
    },
  });
}

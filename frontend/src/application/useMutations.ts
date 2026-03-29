"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLocation } from "@/infrastructure/api/locationApi";
import { createUser } from "@/infrastructure/api/userApi";
import { createLifeLog, deleteLifeLog, endLifeLog } from "@/infrastructure/api/lifeLogApi";

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useCreateLifeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLifeLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useEndLifeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, endedAt }: { logId: number; endedAt: string }) =>
      endLifeLog(logId, endedAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useDeleteLifeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLifeLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

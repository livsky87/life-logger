"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSimulation,
  deleteSimulation,
  fetchSimulations,
  updateSimulation,
} from "@/infrastructure/api/simulationApi";
import type { SimulationCreate, SimulationUpdate } from "@/domain/simulationTypes";

export function useSimulations() {
  return useQuery({
    queryKey: ["simulations"],
    queryFn: fetchSimulations,
    staleTime: 60_000,
  });
}

export function useCreateSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SimulationCreate) => createSimulation(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simulations"] }),
  });
}

export function useUpdateSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SimulationUpdate }) =>
      updateSimulation(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simulations"] }),
  });
}

export function useDeleteSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSimulation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simulations"] }),
  });
}

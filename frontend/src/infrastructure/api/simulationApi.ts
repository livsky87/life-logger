import type { Simulation, SimulationCreate, SimulationUpdate } from "@/domain/simulationTypes";
import { apiFetch } from "./client";

export async function fetchSimulations(): Promise<Simulation[]> {
  return apiFetch<Simulation[]>("/api/v1/simulations");
}

export async function fetchSimulation(id: number): Promise<Simulation> {
  return apiFetch<Simulation>(`/api/v1/simulations/${id}`);
}

export async function createSimulation(body: SimulationCreate): Promise<Simulation> {
  return apiFetch<Simulation>("/api/v1/simulations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSimulation(id: number, body: SimulationUpdate): Promise<Simulation> {
  return apiFetch<Simulation>(`/api/v1/simulations/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteSimulation(id: number): Promise<void> {
  await apiFetch<void>(`/api/v1/simulations/${id}`, { method: "DELETE" });
}

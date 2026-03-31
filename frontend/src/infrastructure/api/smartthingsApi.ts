import type { SmartThingsDevice } from "@/domain/simulationTypes";
import { apiFetch } from "./client";

export interface SmartThingsDevicesResponse {
  items: SmartThingsDevice[];
  _links?: unknown;
}

export async function fetchSmartThingsDevices(): Promise<SmartThingsDevice[]> {
  const res = await apiFetch<SmartThingsDevicesResponse>("/api/v1/proxy/smartthings/devices");
  return res.items ?? [];
}

export async function fetchDeviceStatus(deviceId: string): Promise<unknown> {
  return apiFetch<unknown>(`/api/v1/proxy/smartthings/devices/${deviceId}/status`);
}

export async function sendDeviceCommand(deviceId: string, commands: unknown[]): Promise<unknown> {
  return apiFetch<unknown>(`/api/v1/proxy/smartthings/devices/${deviceId}/commands`, {
    method: "POST",
    body: JSON.stringify({ commands }),
  });
}

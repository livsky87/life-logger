export interface SmartThingsDevice {
  deviceId: string;
  name: string;
  label: string;
  roomId: string;
  type?: string;
  components?: unknown[];
  [key: string]: unknown;
}

export interface Simulation {
  id: number;
  location_id: string;
  name: string;
  devices: SmartThingsDevice[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SimulationCreate {
  location_id: string;
  name: string;
  devices?: SmartThingsDevice[];
  metadata?: Record<string, unknown>;
}

export interface SimulationUpdate {
  location_id?: string;
  name?: string;
  devices?: SmartThingsDevice[];
  metadata?: Record<string, unknown>;
}

export interface HomePresenceStatus {
  inferenceId: string;
  locationId: string;
  version: number;
  result: string;       // e.g. "home" | "away"
  feedback?: {
    feedback: string;
  };
}

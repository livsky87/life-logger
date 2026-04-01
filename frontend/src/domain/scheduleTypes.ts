export type ScheduleStatus = "normal" | "warning" | "error";

export interface ScheduleCall {
  method: string;
  url: string;
  deviceId: string;
  commands: unknown[];
  dsec: number;
  result: string | null;
}

export interface Schedule {
  id: number;
  user_id: string | null;  // UUID of the associated user (nullable)
  date: number;            // YYYYMMDD
  hour: number;
  minute: number;
  description: string;
  calls: ScheduleCall[];
  location: string;
  is_home: boolean;
  metadata: Record<string, unknown>;
  status: ScheduleStatus;
  created_at: string;
}

export interface ScheduleCreate {
  user_id?: string | null;
  date: number;
  hour: number;
  minute: number;
  description: string;
  calls?: ScheduleCall[];
  location?: string;
  is_home?: boolean;
  metadata?: Record<string, unknown>;
  status?: ScheduleStatus;
}

export interface ScheduleUpdate {
  user_id?: string | null;
  date?: number;
  hour?: number;
  minute?: number;
  description?: string;
  calls?: ScheduleCall[];
  location?: string;
  is_home?: boolean;
  metadata?: Record<string, unknown>;
  status?: ScheduleStatus;
}

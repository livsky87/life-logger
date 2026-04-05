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
  user_id: string | null;
  datetime: string;         // ISO 8601 datetime with timezone, e.g. "2026-04-02T06:30:00+09:00"
  description: string;
  calls: ScheduleCall[];
  location: string;
  is_home: boolean;
  metadata: Record<string, unknown>;
  status: string[];         // activity tags e.g. ["요리"], ["수면"], []
  created_at: string;
}

export interface ScheduleCreate {
  user_id?: string | null;
  datetime: string;
  description: string;
  calls?: ScheduleCall[];
  location?: string;
  is_home?: boolean;
  metadata?: Record<string, unknown>;
  status?: string[];
}

export interface ScheduleUpdate {
  user_id?: string | null;
  datetime?: string;
  description?: string;
  calls?: ScheduleCall[];
  location?: string;
  is_home?: boolean;
  metadata?: Record<string, unknown>;
  status?: string[];
}

export interface ScheduleBatchCreate {
  entries: ScheduleCreate[];
  replace?: boolean;
  user_name?: string;
  user_job?: string;
  location_id?: string;
  location_name?: string;
  timezone?: string;
}

export interface ScheduleBatchResult {
  deleted: number;
  created: number;
  user_id: string;
  location_id: string;
  date: number;
}

// ── Timeline types ──

export interface ScheduleTimelineUser {
  user_id: string;
  user_name: string;
  user_job: string | null;
  entries: Schedule[];
}

export interface ScheduleTimelineLocation {
  location_id: string;
  name: string;
  timezone: string;
  users: ScheduleTimelineUser[];
}

export interface ScheduleTimelineResponse {
  date: number;
  range_days: number;
  locations: ScheduleTimelineLocation[];
}

/** 스케줄 타임라인 UI 레이어 on/off */
export interface ScheduleTimelineDisplayFilter {
  showHeaderTicks: boolean;
  showGridLines: boolean;
  showPresenceBars: boolean;
  showEntryDots: boolean;
  showStatusTags: boolean;
  /** 스케줄 Device 호출 세로선·밴드 */
  showApiCallMarkers: boolean;
  showNowLine: boolean;
  showActivityHeatmap: boolean;
  /** HDE 수집 데이터(하단 밴드) */
  showPeriodicObservations: boolean;
}

export function defaultScheduleTimelineDisplayFilter(): ScheduleTimelineDisplayFilter {
  return {
    showHeaderTicks: true,
    showGridLines: true,
    showPresenceBars: true,
    showEntryDots: true,
    showStatusTags: true,
    showApiCallMarkers: true,
    showNowLine: true,
    showActivityHeatmap: true,
    showPeriodicObservations: true,
  };
}

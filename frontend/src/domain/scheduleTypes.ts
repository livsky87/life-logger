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
  /** Household account id — same role as user_id when user_id is omitted */
  account_id?: string | null;
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
  account_id?: string | null;
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
  /** If set and first entry has no user_id/account_id, used as batch user id */
  account_id?: string;
  user_name?: string;
  user_job?: string;
  user_age?: number | null;
  user_gender?: string | null;
  user_personality?: string | null;
  user_daily_style?: string | null;
  location_id?: string;
  location_name?: string;
  timezone?: string;
  residence_city?: string | null;
  residence_type?: string | null;
  country?: string | null;
}

export interface ScheduleBatchResult {
  deleted: number;
  created: number;
  user_id: string;
  account_id: string;
  location_id: string;
  date: number;
}

// ── Timeline types ──

export interface ScheduleTimelineUser {
  user_id: string;
  account_id: string;
  user_name: string;
  user_job: string | null;
  age: number | null;
  gender: string | null;
  personality: string | null;
  daily_style: string | null;
  entries: Schedule[];
}

export interface ScheduleTimelineLocation {
  location_id: string;
  name: string;
  timezone: string;
  residence_city: string | null;
  residence_type: string | null;
  country: string | null;
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

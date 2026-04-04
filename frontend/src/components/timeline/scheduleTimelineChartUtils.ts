import type { Schedule, ScheduleCall } from "@/domain/scheduleTypes";
import type { ResultCategory, SegmentType } from "./scheduleTimelineChartTheme";

/** 시간순 정렬 후, 인접 레코드의 동일 identity 구간을 하나로 합친 덩어리 */
export interface MergedRun {
  key: string;
  identity: string;
  tStart: number;
  tEnd: number;
  entries: Schedule[];
  /**
   * true면 조회 구간 끝까지 이어지며, 그 이후를 가르는 다음 레코드가 없음(끝 시각이 화면 밖·미정).
   * false면 다음 전환 시각이 데이터에 있어 구간 끝이 명확함.
   */
  openEnded: boolean;
}

export function sortEntriesByTime(entries: Schedule[]): Schedule[] {
  return [...entries].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
  );
}

/** 상태 비교용 정규 키 (태그 순서 무시) */
export function scheduleStatusIdentity(entry: Schedule): string {
  const s = entry.status;
  if (!s?.length) return "";
  return [...s].sort().join("\u0001");
}

export function schedulePresenceIdentity(entry: Schedule): string {
  return getSegmentType(entry.location, entry.is_home);
}

/**
 * 전·후 레코드와 identity가 같으면 한 구간으로 합침.
 * 구간 [tStart, tEnd): tEnd는 다음 다른 identity의 첫 시각 또는 range 끝.
 */
export function buildMergedRuns(
  entries: Schedule[],
  rangeEndMs: number,
  getIdentity: (e: Schedule) => string,
): MergedRun[] {
  const sorted = sortEntriesByTime(entries);
  if (sorted.length === 0) return [];
  const out: MergedRun[] = [];
  let i = 0;
  while (i < sorted.length) {
    const identity = getIdentity(sorted[i]);
    const group: Schedule[] = [sorted[i]];
    let j = i + 1;
    while (j < sorted.length && getIdentity(sorted[j]) === identity) {
      group.push(sorted[j]);
      j++;
    }
    const tStart = new Date(sorted[i].datetime).getTime();
    const tEnd = j < sorted.length ? new Date(sorted[j].datetime).getTime() : rangeEndMs;
    out.push({
      key: `${identity || "__none__"}::${tStart}`,
      identity,
      tStart,
      tEnd: Math.max(tStart + 1, tEnd),
      entries: group,
      openEnded: j >= sorted.length,
    });
    i = j;
  }
  return out;
}

export function getSegmentType(location: string, isHome: boolean): SegmentType {
  if (!isHome) {
    if (location.includes("이동") || location.includes("출근") || location.includes("귀가")) return "transit";
    if (location.includes("회사") || location.includes("사무")) return "work";
    return "away";
  }
  return "home";
}

/** API result 문자열 → 시각화 카테고리 */
export function classifyApiResult(result: string | null | undefined): ResultCategory {
  if (result == null || String(result).trim() === "") return "empty";
  const s = String(result).toLowerCase();
  if (/\b(error|fail|failed|exception|timeout|4\d\d|5\d\d)\b/.test(s)) return "error";
  if (/\b(success|succeeded|ok\b|200|201|204)\b/.test(s)) return "success";
  if (s.includes("expected")) return "expected";
  return "other";
}

export interface ApiCallMarker {
  key: string;
  tMs: number;
  scheduleEntry: Schedule;
  call: ScheduleCall;
  callIndex: number;
  category: ResultCategory;
}

/**
 * 각 스케줄 시점 이후 dsec 누적으로 호출 시각을 잡아, 한 엔트리에 여러 호출이 겹치지 않게 함.
 */
export function buildApiCallMarkers(entries: Schedule[]): ApiCallMarker[] {
  const sorted = sortEntriesByTime(entries);
  const out: ApiCallMarker[] = [];
  for (const entry of sorted) {
    let cursor = new Date(entry.datetime).getTime();
    entry.calls.forEach((call, idx) => {
      out.push({
        key: `api-${entry.id}-${idx}-${cursor}`,
        tMs: cursor,
        scheduleEntry: entry,
        call,
        callIndex: idx,
        category: classifyApiResult(call.result),
      });
      cursor += Math.max(250, (call.dsec ?? 0) * 1000);
    });
  }
  return out;
}

const EMPTY_LANE_SENTINEL = "__EMPTY__";

/** 스케줄에 등장하는 모든 상태 태그(정렬) + 비어 있음 행 */
export function collectDistinctStatusTags(entries: Schedule[]): string[] {
  const set = new Set<string>();
  let hasEmpty = false;
  for (const e of entries) {
    if (!e.status?.length) hasEmpty = true;
    else e.status.forEach((t) => set.add(t));
  }
  const tags = Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  if (hasEmpty) tags.push(EMPTY_LANE_SENTINEL);
  return tags;
}

function entryHasStatusLaneTag(entry: Schedule, laneTag: string): boolean {
  if (laneTag === EMPTY_LANE_SENTINEL) return !entry.status?.length;
  return entry.status?.includes(laneTag) ?? false;
}

/**
 * 한 태그(행) 안에서, 시간순으로 해당 태그가 붙어 있는 연속 구간을 캘린더 블록처럼 병합.
 * 복합 태그 엔트리는 각 태그 행에 동시에 나타남.
 */
export function buildPerTagMergedRuns(
  entries: Schedule[],
  rangeEndMs: number,
  laneTag: string,
): MergedRun[] {
  const sorted = sortEntriesByTime(entries);
  if (sorted.length === 0) return [];
  const out: MergedRun[] = [];
  let i = 0;
  const n = sorted.length;
  while (i < n) {
    while (i < n && !entryHasStatusLaneTag(sorted[i], laneTag)) i++;
    if (i >= n) break;
    const group: Schedule[] = [];
    let j = i;
    while (j < n && entryHasStatusLaneTag(sorted[j], laneTag)) {
      group.push(sorted[j]);
      j++;
    }
    const tStart = new Date(sorted[i].datetime).getTime();
    const tEnd = j < n ? new Date(sorted[j].datetime).getTime() : rangeEndMs;
    const identity = laneTag === EMPTY_LANE_SENTINEL ? "" : laneTag;
    out.push({
      key: `${laneTag}::${tStart}`,
      identity,
      tStart,
      tEnd: Math.max(tStart + 1, tEnd),
      entries: group,
      openEnded: j >= n,
    });
    i = j;
  }
  return out;
}

export function laneTagToDisplayLabel(laneTag: string): string {
  if (laneTag === EMPTY_LANE_SENTINEL) return "상태 없음";
  return laneTag;
}

export { EMPTY_LANE_SENTINEL };

function hourInTimeZone(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const raw = parts.find((p) => p.type === "hour")?.value ?? "0";
  let h = parseInt(raw, 10);
  if (!Number.isFinite(h)) h = 0;
  if (h === 24) h = 0;
  return h;
}

/** 시간대별 0–23시 슬롯 집계(로컬 시계 시각 기준; 타임라인 축과 픽셀 정렬에는 `buildHourBucketsForRange` 권장) */
export function buildDensityMap(entries: Schedule[], timeZone: string): number[] {
  const slots = new Array(24).fill(0);
  for (const e of entries) {
    const h = hourInTimeZone(new Date(e.datetime), timeZone);
    slots[h]++;
  }
  return slots;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * [rangeStartMs, rangeEndMs) 를 1시간 단위로 자른 버킷 — 메인 차트 X 도메인과 동일 선상에서 픽셀 정렬 가능.
 */
export function buildHourBucketsForRange(
  entries: Schedule[],
  rangeStartMs: number,
  rangeEndMs: number,
): number[] {
  const span = rangeEndMs - rangeStartMs;
  if (span <= 0) return [];
  const n = Math.max(1, Math.round(span / HOUR_MS));
  const buckets = new Array(n).fill(0);
  for (const e of entries) {
    const t = new Date(e.datetime).getTime();
    if (t < rangeStartMs || t >= rangeEndMs) continue;
    const k = Math.floor((t - rangeStartMs) / HOUR_MS);
    if (k >= 0 && k < n) buckets[k]++;
  }
  return buckets;
}

export { HOUR_MS };

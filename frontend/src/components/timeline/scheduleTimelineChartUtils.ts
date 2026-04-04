import type { Schedule, ScheduleCall } from "@/domain/scheduleTypes";
import type { ResultCategory, SegmentType } from "./scheduleTimelineChartTheme";

/** 시간순 정렬 후, 인접 레코드의 동일 identity 구간을 하나로 합친 덩어리 */
export interface MergedRun {
  key: string;
  identity: string;
  tStart: number;
  tEnd: number;
  entries: Schedule[];
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

export function buildDensityMap(entries: Schedule[]): number[] {
  const slots = new Array(24).fill(0);
  for (const e of entries) {
    const d = new Date(e.datetime);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const h = kst.getUTCHours();
    slots[h]++;
  }
  return slots;
}

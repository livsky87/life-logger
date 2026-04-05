import type { LifeLogEvent } from "@/domain/types";

export const DAY_MINUTES = 24 * 60;

/** 타임라인 API(`schedules/timeline`)와 동일: dateInt(YYYYMMDD) 자정 KST부터 days일 [start, end) */
export function kstDateIntRangeToDates(
  dateInt: number,
  days: number,
): { rangeStart: Date; rangeEnd: Date } {
  const raw = String(dateInt).padStart(8, "0");
  const y = raw.slice(0, 4);
  const mo = raw.slice(4, 6);
  const da = raw.slice(6, 8);
  const rangeStart = new Date(`${y}-${mo}-${da}T00:00:00+09:00`);
  const rangeEnd = new Date(rangeStart.getTime() + days * 24 * 60 * 60 * 1000);
  return { rangeStart, rangeEnd };
}

export const DEFAULT_TIMELINE_TIMEZONE = "Asia/Seoul";

export function normalizeTimelineTimeZone(tz: string | null | undefined): string {
  const t = tz?.trim();
  return t && t.length > 0 ? t : DEFAULT_TIMELINE_TIMEZONE;
}

/** X축·눈금용 시:분 (해당 IANA 타임존) */
export function formatTimeInTimeZone(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh}:${mm}`;
}

/** 호버 시각과 이벤트가 타임존 기준 같은 연·월·일·시·분인지 (차트 ‘8:24’와 일정/Device/HDE 정렬) */
export function isSameWallClockMinute(
  aMs: number,
  bMs: number,
  timeZone: string,
): boolean {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const wallKey = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-CA", opts).formatToParts(new Date(ms));
    const g = (t: Intl.DateTimeFormatPart["type"]) =>
      parts.find((p) => p.type === t)?.value ?? "";
    return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
  };
  return wallKey(aMs) === wallKey(bMs);
}

/** X축 다일: 월/일·요일 */
export function formatTimelineDayInZone(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(ms));
}

/** X축 장기: 월/일 */
export function formatTimelineShortDateInZone(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    month: "numeric",
    day: "numeric",
  }).format(new Date(ms));
}

/** Converts an ISO datetime string to minutes-since-midnight in the given timezone. */
export function toMinutesOfDay(isoStr: string, timezone: string): number {
  const date = new Date(isoStr);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return hour * 60 + minute;
}

export interface PositionedEvent {
  event: LifeLogEvent;
  leftPct: number;
  widthPct: number;
  isPoint: boolean;
}

/**
 * Converts an event to its CSS percentage position within a [rangeStart, rangeEnd] window.
 */
export function positionEvent(
  event: LifeLogEvent,
  rangeStart: Date,
  rangeEnd: Date,
): PositionedEvent {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const startMs = new Date(event.started_at).getTime();
  const endMs = event.ended_at
    ? new Date(event.ended_at).getTime()
    : startMs + 5 * 60 * 1000; // 5 min fallback for point events

  const leftPct = Math.max(0, ((startMs - rangeStart.getTime()) / totalMs) * 100);
  const widthPct = Math.max(((endMs - startMs) / totalMs) * 100, 0.15);
  return { event, leftPct, widthPct, isPoint: !event.ended_at };
}

/**
 * Assigns each context event a vertical lane index so overlapping events
 * are rendered in separate lanes. Uses absolute timestamps.
 * Returns Map<event.id, laneIndex>.
 */
export function assignContextLanes(events: LifeLogEvent[]): Map<number, number> {
  const sorted = [...events].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );
  const laneEndMs: number[] = [];
  const lanes = new Map<number, number>();

  for (const ev of sorted) {
    const startMs = new Date(ev.started_at).getTime();
    const endMs = ev.ended_at
      ? new Date(ev.ended_at).getTime()
      : startMs + 2 * 60 * 60 * 1000; // 2h fallback

    let assigned = -1;
    for (let i = 0; i < laneEndMs.length; i++) {
      if (laneEndMs[i] <= startMs) {
        assigned = i;
        laneEndMs[i] = endMs;
        break;
      }
    }
    if (assigned === -1) {
      assigned = laneEndMs.length;
      laneEndMs.push(endMs);
    }
    lanes.set(ev.id, assigned);
  }
  return lanes;
}

/** Generates X-axis tick marks for the given range. */
export interface Tick {
  pct: number;
  label: string;
}

export function getTimeTicks(rangeStart: Date, rangeEnd: Date, timezone: string): Tick[] {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const spanDays = totalMs / dayMs;
  const ticks: Tick[] = [];
  const tz = normalizeTimelineTimeZone(timezone);

  if (spanDays <= 1) {
    const hourMs = 60 * 60 * 1000;
    for (let h = 0; h <= 24; h += 2) {
      const tickMs = rangeStart.getTime() + h * hourMs;
      if (tickMs > rangeEnd.getTime()) break;
      const pct = ((tickMs - rangeStart.getTime()) / totalMs) * 100;
      ticks.push({ pct, label: formatTimeInTimeZone(tickMs, tz) });
    }
  } else if (spanDays <= 8) {
    let tickMs = rangeStart.getTime();
    while (tickMs < rangeEnd.getTime()) {
      const pct = ((tickMs - rangeStart.getTime()) / totalMs) * 100;
      ticks.push({ pct, label: formatTimelineDayInZone(tickMs, tz) });
      tickMs += dayMs;
    }
  } else {
    const stepDays = spanDays <= 14 ? 2 : 5;
    let tickMs = rangeStart.getTime();
    while (tickMs < rangeEnd.getTime()) {
      const pct = ((tickMs - rangeStart.getTime()) / totalMs) * 100;
      ticks.push({ pct, label: formatTimelineShortDateInZone(tickMs, tz) });
      tickMs += stepDays * dayMs;
    }
  }
  return ticks;
}

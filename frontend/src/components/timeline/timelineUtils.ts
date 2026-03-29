import type { LifeLogEvent } from "@/domain/types";

export const DAY_MINUTES = 24 * 60;

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
  const days = totalMs / dayMs;
  const ticks: Tick[] = [];

  const fmt = (date: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("ko-KR", { timeZone: timezone, ...opts }).format(date);

  if (days <= 1) {
    // Every 2 hours
    for (let h = 0; h <= 24; h += 2) {
      const ms = h * 60 * 60 * 1000;
      ticks.push({ pct: (ms / totalMs) * 100, label: String(h).padStart(2, "0") });
    }
  } else if (days <= 8) {
    // Every day
    const d = new Date(rangeStart);
    while (d < rangeEnd) {
      const pct = ((d.getTime() - rangeStart.getTime()) / totalMs) * 100;
      ticks.push({ pct, label: fmt(d, { month: "numeric", day: "numeric", weekday: "short" }) });
      d.setDate(d.getDate() + 1);
    }
  } else {
    // Every ~5 days
    const d = new Date(rangeStart);
    while (d < rangeEnd) {
      const pct = ((d.getTime() - rangeStart.getTime()) / totalMs) * 100;
      ticks.push({ pct, label: fmt(d, { month: "numeric", day: "numeric" }) });
      d.setDate(d.getDate() + (days <= 14 ? 2 : 5));
    }
  }
  return ticks;
}

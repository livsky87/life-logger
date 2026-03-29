import type { LifeLogEvent } from "@/domain/types";

export const HOUR_WIDTH_PX = 80; // px per hour column
export const DAY_MINUTES = 24 * 60;

/**
 * Converts a datetime string to minutes-since-midnight in the given timezone.
 * Falls back to UTC if timezone is invalid.
 */
export function toMinutesOfDay(isoStr: string, timezone: string): number {
  const date = new Date(isoStr);
  // Use Intl to get local time parts
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
  leftPct: number;  // 0-100 percentage across 24h
  widthPct: number; // 0-100 percentage width
  isPoint: boolean; // true if no ended_at
}

/**
 * Converts an event to its CSS percentage position within a 24-hour row.
 */
export function positionEvent(event: LifeLogEvent, timezone: string): PositionedEvent {
  const startMin = toMinutesOfDay(event.started_at, timezone);
  const endMin = event.ended_at
    ? toMinutesOfDay(event.ended_at, timezone)
    : startMin + 5; // point events get 5min display width

  const leftPct = (startMin / DAY_MINUTES) * 100;
  const widthPct = Math.max(((endMin - startMin) / DAY_MINUTES) * 100, 0.35); // min 0.35% width
  return { event, leftPct, widthPct, isPoint: !event.ended_at };
}

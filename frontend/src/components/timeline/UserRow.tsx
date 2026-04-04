"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { LifeLogEvent, TimelineUser, TimelineFilter } from "@/domain/types";
import type { Schedule } from "@/domain/scheduleTypes";
import { getEventStyle, type EventStyle } from "./eventConfig";
import { positionEvent, assignContextLanes } from "./timelineUtils";

const LANE_H = 18;
const LANE_GAP = 2;
const LANE_PAD = 4;
const DOT_ZONE = 24;
const LOC_H = 8;

// ── Tooltip types ─────────────────────────────────────────────────────────────

interface TooltipState {
  x: number;
  y: number;
  content: React.ReactNode;
}

// ── Schedule overlay helpers ──────────────────────────────────────────────────

function scheduleEntryToDate(entry: Schedule): Date {
  return parseISO(entry.datetime);
}

function calcLeftPct(date: Date, rangeStart: Date, rangeEnd: Date): number {
  const total = rangeEnd.getTime() - rangeStart.getTime();
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, ((date.getTime() - rangeStart.getTime()) / total) * 100));
}

// ── Visibility filter ─────────────────────────────────────────────────────────

/**
 * Minimum event duration to render (in ms).
 * Events narrower than ~1.5px on a typical 900px-wide timeline are skipped.
 */
function minVisibleMs(rangeStart: Date, rangeEnd: Date): number {
  return (rangeEnd.getTime() - rangeStart.getTime()) / 600;
}

function isWideEnough(ev: LifeLogEvent, rangeStart: Date, rangeEnd: Date): boolean {
  const minMs = minVisibleMs(rangeStart, rangeEnd);
  const startMs = new Date(ev.started_at).getTime();
  const endMs = ev.ended_at ? new Date(ev.ended_at).getTime() : startMs + 5 * 60 * 1000;
  return (endMs - startMs) >= minMs;
}

// ── PresenceSegments ──────────────────────────────────────────────────────────

const PresenceSegments = React.memo(function PresenceSegments({
  entries, rangeStart, rangeEnd, rowHeight,
}: {
  entries: Schedule[]; rangeStart: Date; rangeEnd: Date; rowHeight: number;
}) {
  return (
    <>
      {entries.map((entry, i) => {
        const startDate = scheduleEntryToDate(entry);
        const nextEntry = entries[i + 1];
        const endDate = nextEntry ? scheduleEntryToDate(nextEntry) : rangeEnd;
        const leftPct = calcLeftPct(startDate, rangeStart, rangeEnd);
        const endPct = calcLeftPct(endDate, rangeStart, rangeEnd);
        const widthPct = Math.max(0, endPct - leftPct);
        if (widthPct <= 0) return null;
        return (
          <div
            key={entry.id}
            className={`absolute rounded-sm opacity-70 ${entry.is_home ? "bg-blue-400" : "bg-gray-300"}`}
            style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: 6, top: rowHeight - 6 }}
            title={entry.is_home ? "집 안" : "집 밖"}
          />
        );
      })}
    </>
  );
});

// ── Schedule tooltip builders ─────────────────────────────────────────────────

function buildScheduleTooltip(entry: Schedule): React.ReactNode {
  return (
    <div>
      <div className="font-semibold text-violet-300">
        {format(parseISO(entry.datetime), "HH:mm")}
        {entry.location && <span className="ml-1.5 text-gray-400">📍 {entry.location}</span>}
      </div>
      <div className="text-gray-300 mt-0.5 max-w-[200px] whitespace-normal">{entry.description}</div>
      {entry.calls.length > 0 && (
        <div className="text-amber-400 mt-0.5">⚡ {entry.calls.length}건 호출</div>
      )}
    </div>
  );
}

function buildCallTooltip(entry: Schedule): React.ReactNode {
  return (
    <div className="min-w-max max-w-xs">
      <div className="mb-1 font-semibold text-amber-300">
        {format(parseISO(entry.datetime), "HH:mm")} API 호출
      </div>
      {entry.calls.map((c, i) => (
        <div key={i} className="text-gray-300 mt-0.5">
          <span className="text-yellow-300 font-mono">{c.method}</span>{" "}
          <span className="text-blue-300 text-[10px]">{c.url.slice(0, 40)}{c.url.length > 40 ? "…" : ""}</span>
          {c.dsec > 0 && <span className="text-gray-500 ml-1">@{c.dsec}초</span>}
        </div>
      ))}
    </div>
  );
}

function buildEventTooltip(event: LifeLogEvent, style: EventStyle): React.ReactNode {
  const start = format(new Date(event.started_at), "MM/dd HH:mm");
  const end = event.ended_at ? format(new Date(event.ended_at), "MM/dd HH:mm") : null;
  const extra = Object.entries(event.data).map(([k, v]) => `${k}: ${v}`).join(" · ");
  return (
    <div>
      <div className="font-semibold">{style.label || event.event_type}</div>
      <div className="text-gray-300 mt-0.5">{start}{end ? ` → ${end}` : " (진행 중)"}</div>
      {extra && <div className="text-gray-400 mt-0.5">{extra}</div>}
    </div>
  );
}

// ── Shared Tooltip ────────────────────────────────────────────────────────────

function GlobalTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return (
    <div
      className="fixed z-[9999] rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl pointer-events-none"
      style={{ left: tooltip.x + 14, top: tooltip.y - 60 }}
    >
      {tooltip.content}
    </div>
  );
}

// ── ContextBar ────────────────────────────────────────────────────────────────

const ContextBar = React.memo(function ContextBar({
  event, rangeStart, rangeEnd, topPx, onHover, onLeave,
}: {
  event: LifeLogEvent; rangeStart: Date; rangeEnd: Date; topPx: number;
  onHover: (x: number, y: number, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  const style = useMemo(() => getEventStyle(event.category, event.event_type), [event.category, event.event_type]);
  const { leftPct, widthPct } = useMemo(() => positionEvent(event, rangeStart, rangeEnd), [event, rangeStart, rangeEnd]);
  const tooltip = useMemo(() => buildEventTooltip(event, style), [event, style]);

  return (
    <div
      className={`absolute rounded cursor-pointer opacity-80 hover:opacity-100 transition-opacity ${style.color}`}
      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.6)}%`, top: topPx, height: LANE_H - LANE_GAP }}
      onMouseMove={(e) => onHover(e.clientX, e.clientY, tooltip)}
      onMouseLeave={onLeave}
    >
      <span className={`text-[10px] font-medium px-1 leading-none flex items-center h-full truncate ${style.textColor} select-none`}>
        {style.label || event.event_type}
      </span>
    </div>
  );
});

// ── EventDot ──────────────────────────────────────────────────────────────────

const EventDot = React.memo(function EventDot({
  event, rangeStart, rangeEnd, centerY, onHover, onLeave,
}: {
  event: LifeLogEvent; rangeStart: Date; rangeEnd: Date; centerY: number;
  onHover: (x: number, y: number, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  const style = useMemo(() => getEventStyle(event.category, event.event_type), [event.category, event.event_type]);
  const { leftPct } = useMemo(() => positionEvent(event, rangeStart, rangeEnd), [event, rangeStart, rangeEnd]);
  const tooltip = useMemo(() => buildEventTooltip(event, style), [event, style]);
  const SIZE = 10;
  return (
    <div
      className={`absolute rounded-full cursor-pointer opacity-85 hover:opacity-100 transition-opacity ring-1 ring-white/40 ${style.color}`}
      style={{ left: `calc(${leftPct}% - ${SIZE / 2}px)`, width: SIZE, height: SIZE, top: centerY - SIZE / 2 }}
      onMouseMove={(e) => onHover(e.clientX, e.clientY, tooltip)}
      onMouseLeave={onLeave}
    />
  );
});

// ── ApiLine ───────────────────────────────────────────────────────────────────

function getApiStatusBadge(status: unknown): { bg: string; icon: React.ReactNode } {
  const code = typeof status === "number" ? status : null;
  if (code === null) return { bg: "bg-gray-400", icon: <span className="text-white text-[8px] font-bold leading-none">?</span> };
  if (code < 300) return {
    bg: "bg-emerald-500",
    icon: <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>,
  };
  if (code < 400) return {
    bg: "bg-blue-400",
    icon: <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,5 8,5 5.5,2.5"/><line x1="8" y1="5" x2="5.5" y2="7.5"/></svg>,
  };
  if (code < 500) return {
    bg: "bg-amber-400",
    icon: <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="2" x2="5" y2="6.5"/><circle cx="5" cy="8.5" r="0.5" fill="currentColor" stroke="none"/></svg>,
  };
  return {
    bg: "bg-red-500",
    icon: <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg>,
  };
}

const ApiLine = React.memo(function ApiLine({
  event, rangeStart, rangeEnd, rowHeight, onHover, onLeave,
}: {
  event: LifeLogEvent; rangeStart: Date; rangeEnd: Date; rowHeight: number;
  onHover: (x: number, y: number, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  const style = useMemo(() => getEventStyle(event.category, event.event_type), [event.category, event.event_type]);
  const { leftPct } = useMemo(() => positionEvent(event, rangeStart, rangeEnd), [event, rangeStart, rangeEnd]);
  const badge = useMemo(() => getApiStatusBadge(event.data.status), [event.data.status]);
  const tooltip = useMemo(() => buildEventTooltip(event, style), [event, style]);
  const lineHeight = rowHeight - LOC_H - 7;

  return (
    <div
      className="absolute cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
      style={{ left: `${leftPct}%`, top: 0, width: 14, transform: "translateX(-7px)" }}
      onMouseMove={(e) => onHover(e.clientX, e.clientY, tooltip)}
      onMouseLeave={onLeave}
    >
      <div className={`mx-auto w-0.5 ${style.color}`} style={{ height: lineHeight }} />
      <div className={`mx-auto w-3.5 h-3.5 rounded-full ${badge.bg} flex items-center justify-center mt-px`}>
        {badge.icon}
      </div>
    </div>
  );
});

// ── LocationBar ───────────────────────────────────────────────────────────────

const LocationBar = React.memo(function LocationBar({
  event, rangeStart, rangeEnd, rowHeight, onHover, onLeave,
}: {
  event: LifeLogEvent; rangeStart: Date; rangeEnd: Date; rowHeight: number;
  onHover: (x: number, y: number, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  const style = useMemo(() => getEventStyle(event.category, event.event_type), [event.category, event.event_type]);
  const { leftPct, widthPct } = useMemo(() => positionEvent(event, rangeStart, rangeEnd), [event, rangeStart, rangeEnd]);
  const tooltip = useMemo(() => buildEventTooltip(event, style), [event, style]);

  return (
    <div
      className={`absolute rounded-sm cursor-pointer opacity-80 hover:opacity-100 transition-opacity ${style.color}`}
      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.5)}%`, height: LOC_H, top: rowHeight - LOC_H }}
      onMouseMove={(e) => onHover(e.clientX, e.clientY, tooltip)}
      onMouseLeave={onLeave}
    />
  );
});

// ── ScheduleEventDot ──────────────────────────────────────────────────────────

const ScheduleEventDot = React.memo(function ScheduleEventDot({
  entry, rangeStart, rangeEnd, centerY, onHover, onLeave,
}: {
  entry: Schedule; rangeStart: Date; rangeEnd: Date; centerY: number;
  onHover: (x: number, y: number, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  const date = useMemo(() => scheduleEntryToDate(entry), [entry]);
  const leftPct = useMemo(() => calcLeftPct(date, rangeStart, rangeEnd), [date, rangeStart, rangeEnd]);
  const tooltip = useMemo(() => buildScheduleTooltip(entry), [entry]);
  const SIZE = 9;

  return (
    <div
      className="absolute rounded-full cursor-pointer bg-violet-500 ring-1 ring-white/50 opacity-85 hover:opacity-100 transition-opacity"
      style={{ left: `calc(${leftPct}% - ${SIZE / 2}px)`, width: SIZE, height: SIZE, top: centerY - SIZE / 2 }}
      onMouseMove={(e) => onHover(e.clientX, e.clientY, tooltip)}
      onMouseLeave={onLeave}
    />
  );
});

// ── ScheduleCallMarker ────────────────────────────────────────────────────────

const ScheduleCallMarker = React.memo(function ScheduleCallMarker({
  entry, rangeStart, rangeEnd, rowHeight, onHover, onLeave,
}: {
  entry: Schedule; rangeStart: Date; rangeEnd: Date; rowHeight: number;
  onHover: (x: number, y: number, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  const date = useMemo(() => scheduleEntryToDate(entry), [entry]);
  const leftPct = useMemo(() => calcLeftPct(date, rangeStart, rangeEnd), [date, rangeStart, rangeEnd]);
  const tooltip = useMemo(() => buildCallTooltip(entry), [entry]);
  if (entry.calls.length === 0) return null;

  return (
    <div
      className="absolute cursor-pointer opacity-80 hover:opacity-100 transition-opacity select-none text-amber-500 text-sm leading-none"
      style={{ left: `calc(${leftPct}% - 6px)`, top: rowHeight - 22 }}
      onMouseMove={(e) => onHover(e.clientX, e.clientY, tooltip)}
      onMouseLeave={onLeave}
    >
      ⚡
    </div>
  );
});

// ── UserRow ───────────────────────────────────────────────────────────────────

interface Props {
  user: TimelineUser;
  rangeStart: Date;
  rangeEnd: Date;
  timezone: string;
  isLast: boolean;
  filter: TimelineFilter;
  scheduleEntries?: Schedule[];
}

export const UserRow = React.memo(function UserRow({
  user, rangeStart, rangeEnd, isLast, filter, scheduleEntries = [],
}: Props) {
  // Single shared tooltip state — greatly reduces DOM nodes vs per-element state
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleHover = useCallback((x: number, y: number, content: React.ReactNode) => {
    setTooltip({ x, y, content });
  }, []);
  const handleLeave = useCallback(() => setTooltip(null), []);

  // Memoize event filtering — apply both filter flags AND isWideEnough
  const { locEvents, ctxEvents, dotEvents, apiEvents } = useMemo(() => ({
    locEvents: filter.showLocation
      ? user.events.filter((e) => e.category === "location" && e.event_type === "home" && isWideEnough(e, rangeStart, rangeEnd))
      : [],
    ctxEvents: filter.showContext
      ? user.events.filter(
          (e) =>
            (e.category === "context" || (e.category === "activity" && e.ended_at)) &&
            (filter.contextTypes.size === 0 || filter.contextTypes.has(e.event_type)) &&
            isWideEnough(e, rangeStart, rangeEnd),
        )
      : [],
    dotEvents: filter.showEvent
      ? user.events.filter(
          (e) =>
            (e.category === "event" || (e.category === "activity" && !e.ended_at)) &&
            (filter.eventTypes.size === 0 || filter.eventTypes.has(e.event_type)) &&
            isWideEnough(e, rangeStart, rangeEnd),
        )
      : [],
    apiEvents: filter.showApi
      ? user.events.filter((e) => e.category === "api_request" && isWideEnough(e, rangeStart, rangeEnd))
      : [],
  }), [user.events, filter, rangeStart, rangeEnd]);

  // Memoize lane assignment
  const ctxLanes = useMemo(() => assignContextLanes(ctxEvents), [ctxEvents]);
  const numLanes = ctxEvents.length > 0 ? Math.max(...Array.from(ctxLanes.values())) + 1 : 1;

  const hasSchedule = scheduleEntries.length > 0;
  const PRESENCE_H = hasSchedule ? 6 : LOC_H;
  const CALL_MARKER_H = hasSchedule ? 16 : 0;
  const rowHeight = LANE_PAD + numLanes * LANE_H + DOT_ZONE + PRESENCE_H + CALL_MARKER_H;
  const dotCenterY = LANE_PAD + numLanes * LANE_H + DOT_ZONE / 2;

  // Memoize schedule entries with calls (for call markers)
  const scheduleWithCalls = useMemo(
    () => scheduleEntries.filter((e) => e.calls.length > 0),
    [scheduleEntries],
  );

  // Build schedule link date string
  const scheduleDateStr = useMemo(
    () => `${rangeStart.getFullYear()}${String(rangeStart.getMonth() + 1).padStart(2, "0")}${String(rangeStart.getDate()).padStart(2, "0")}`,
    [rangeStart],
  );

  return (
    <div className={`flex ${isLast ? "" : "border-b border-gray-100"}`} style={{ height: rowHeight }}>
      {/* User label — clickable → schedule page */}
      <div className="w-[220px] shrink-0 flex items-center px-3 border-r border-gray-200 bg-gray-50 gap-2">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
          {user.user_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/schedule?userId=${user.user_id}&date=${scheduleDateStr}`}
            className="text-sm text-gray-800 font-medium truncate hover:text-indigo-600 transition-colors block"
            title="스케줄 보기"
          >
            {user.user_name}
          </Link>
          {user.user_job && (
            <div className="text-[10px] text-gray-400 truncate leading-tight">{user.user_job}</div>
          )}
        </div>
      </div>

      <div className="relative flex-1 bg-white">
        {/* Hour grid lines */}
        {Array.from({ length: 25 }).map((_, h) => (
          <div key={h} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${(h / 24) * 100}%` }} />
        ))}
        <div className="absolute left-0 right-0 border-t border-dashed border-gray-100" style={{ top: LANE_PAD + numLanes * LANE_H }} />

        {/* Life log events */}
        {ctxEvents.map((ev) => (
          <ContextBar
            key={ev.id} event={ev} rangeStart={rangeStart} rangeEnd={rangeEnd}
            topPx={LANE_PAD + (ctxLanes.get(ev.id) ?? 0) * LANE_H}
            onHover={handleHover} onLeave={handleLeave}
          />
        ))}
        {dotEvents.map((ev) => (
          <EventDot
            key={ev.id} event={ev} rangeStart={rangeStart} rangeEnd={rangeEnd}
            centerY={dotCenterY} onHover={handleHover} onLeave={handleLeave}
          />
        ))}
        {apiEvents.map((ev) => (
          <ApiLine
            key={ev.id} event={ev} rangeStart={rangeStart} rangeEnd={rangeEnd}
            rowHeight={rowHeight} onHover={handleHover} onLeave={handleLeave}
          />
        ))}
        {locEvents.map((ev) => (
          <LocationBar
            key={ev.id} event={ev} rangeStart={rangeStart} rangeEnd={rangeEnd}
            rowHeight={rowHeight} onHover={handleHover} onLeave={handleLeave}
          />
        ))}

        {/* Schedule overlays (only in single-day view) */}
        {hasSchedule && (
          <>
            {scheduleEntries.map((entry) => (
              <ScheduleEventDot
                key={`sched-dot-${entry.id}`}
                entry={entry} rangeStart={rangeStart} rangeEnd={rangeEnd}
                centerY={dotCenterY} onHover={handleHover} onLeave={handleLeave}
              />
            ))}
            {scheduleWithCalls.map((entry) => (
              <ScheduleCallMarker
                key={`sched-call-${entry.id}`}
                entry={entry} rangeStart={rangeStart} rangeEnd={rangeEnd}
                rowHeight={rowHeight} onHover={handleHover} onLeave={handleLeave}
              />
            ))}
            <PresenceSegments entries={scheduleEntries} rangeStart={rangeStart} rangeEnd={rangeEnd} rowHeight={rowHeight} />
          </>
        )}

        {/* Single shared tooltip */}
        <GlobalTooltip tooltip={tooltip} />
      </div>
    </div>
  );
});

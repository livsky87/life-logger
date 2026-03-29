"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { LifeLogEvent, TimelineUser } from "@/domain/types";
import { getEventStyle, type EventStyle } from "./eventConfig";
import { positionEvent, assignContextLanes } from "./timelineUtils";

// Layout constants (px)
const LANE_H = 18;   // height per context lane
const LANE_GAP = 2;  // gap between lanes
const LANE_PAD = 4;  // top padding before first lane
const DOT_ZONE = 24; // height of the dot zone below context lanes
const LOC_H = 8;     // height of the location bar at the very bottom

interface Props {
  user: TimelineUser;
  timezone: string;
  isLast: boolean;
}

// ── shared tooltip ──────────────────────────────────────────────
function Tooltip({
  event,
  style,
  pos,
}: {
  event: LifeLogEvent;
  style: EventStyle;
  pos: { x: number; y: number };
}) {
  const start = format(new Date(event.started_at), "HH:mm");
  const end = event.ended_at ? format(new Date(event.ended_at), "HH:mm") : null;
  const extra = Object.entries(event.data)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  return (
    <div
      className="fixed z-[9999] min-w-max rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl pointer-events-none"
      style={{ left: pos.x + 14, top: pos.y - 56 }}
    >
      <div className="font-semibold">{style.label || event.event_type}</div>
      <div className="text-gray-300 mt-0.5">
        {start}
        {end ? ` → ${end}` : " (진행 중)"}
      </div>
      {extra && <div className="text-gray-400 mt-0.5">{extra}</div>}
    </div>
  );
}

// ── context bar (duration, can overlap) ─────────────────────────
function ContextBar({
  event,
  timezone,
  topPx,
}: {
  event: LifeLogEvent;
  timezone: string;
  topPx: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const style = getEventStyle(event.category, event.event_type);
  const { leftPct, widthPct } = positionEvent(event, timezone);

  return (
    <>
      <div
        className={`absolute rounded cursor-pointer opacity-80 hover:opacity-100 transition-opacity ${style.color}`}
        style={{
          left: `${leftPct}%`,
          width: `${Math.max(widthPct, 0.6)}%`,
          top: topPx,
          height: LANE_H - LANE_GAP,
        }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setPos(null)}
      >
        <span className={`text-[10px] font-medium px-1 leading-none flex items-center h-full truncate ${style.textColor} select-none`}>
          {style.label || event.event_type}
        </span>
      </div>
      {pos && <Tooltip event={event} style={style} pos={pos} />}
    </>
  );
}

// ── event dot (instantaneous) ───────────────────────────────────
function EventDot({
  event,
  timezone,
  centerY,
}: {
  event: LifeLogEvent;
  timezone: string;
  centerY: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const style = getEventStyle(event.category, event.event_type);
  const { leftPct } = positionEvent(event, timezone);
  const DOT_SIZE = 10;

  return (
    <>
      <div
        className={`absolute rounded-full cursor-pointer opacity-85 hover:opacity-100 transition-opacity ring-1 ring-white/40 ${style.color}`}
        style={{
          left: `calc(${leftPct}% - ${DOT_SIZE / 2}px)`,
          width: DOT_SIZE,
          height: DOT_SIZE,
          top: centerY - DOT_SIZE / 2,
        }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setPos(null)}
      />
      {pos && <Tooltip event={event} style={style} pos={pos} />}
    </>
  );
}

// ── location bar (home only, at bottom) ─────────────────────────
function LocationBar({
  event,
  timezone,
  rowHeight,
}: {
  event: LifeLogEvent;
  timezone: string;
  rowHeight: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const style = getEventStyle(event.category, event.event_type);
  const { leftPct, widthPct } = positionEvent(event, timezone);

  return (
    <>
      <div
        className={`absolute rounded-sm cursor-pointer opacity-80 hover:opacity-100 transition-opacity ${style.color}`}
        style={{
          left: `${leftPct}%`,
          width: `${Math.max(widthPct, 0.5)}%`,
          height: LOC_H,
          top: rowHeight - LOC_H,
        }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setPos(null)}
      />
      {pos && <Tooltip event={event} style={style} pos={pos} />}
    </>
  );
}

// ── main row ────────────────────────────────────────────────────
export function UserRow({ user, timezone, isLast }: Props) {
  const locEvents = user.events.filter(
    (e) => e.category === "location" && e.event_type === "home",
  );
  const ctxEvents = user.events.filter(
    (e) => e.category === "context" || (e.category === "activity" && e.ended_at),
  );
  const dotEvents = user.events.filter(
    (e) =>
      e.category === "event" ||
      e.category === "api_request" ||
      (e.category === "activity" && !e.ended_at),
  );

  const ctxLanes = assignContextLanes(ctxEvents, timezone);
  const numLanes = ctxEvents.length > 0 ? Math.max(...Array.from(ctxLanes.values())) + 1 : 1;
  const rowHeight = LANE_PAD + numLanes * LANE_H + DOT_ZONE + LOC_H;
  const dotCenterY = LANE_PAD + numLanes * LANE_H + DOT_ZONE / 2;

  return (
    <div
      className={`flex ${isLast ? "" : "border-b border-gray-100"}`}
      style={{ height: rowHeight }}
    >
      {/* User label */}
      <div className="w-[220px] shrink-0 flex items-center px-3 border-r border-gray-200 bg-gray-50">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2 shrink-0">
          {user.user_name[0]?.toUpperCase()}
        </div>
        <span className="text-sm text-gray-700 truncate">{user.user_name}</span>
      </div>

      {/* 24-hour track */}
      <div className="relative flex-1 bg-white">
        {/* Hour grid lines */}
        {Array.from({ length: 25 }).map((_, h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 border-l border-gray-100"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}

        {/* Dot zone divider */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-gray-100"
          style={{ top: LANE_PAD + numLanes * LANE_H }}
        />

        {/* Context bars */}
        {ctxEvents.map((ev) => (
          <ContextBar
            key={ev.id}
            event={ev}
            timezone={timezone}
            topPx={LANE_PAD + (ctxLanes.get(ev.id) ?? 0) * LANE_H}
          />
        ))}

        {/* Event dots */}
        {dotEvents.map((ev) => (
          <EventDot key={ev.id} event={ev} timezone={timezone} centerY={dotCenterY} />
        ))}

        {/* Location bars */}
        {locEvents.map((ev) => (
          <LocationBar key={ev.id} event={ev} timezone={timezone} rowHeight={rowHeight} />
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import type { LifeLogEvent, TimelineUser } from "@/domain/types";
import { getEventStyle, type EventStyle } from "./eventConfig";
import { positionEvent, assignContextLanes } from "./timelineUtils";

const LANE_H = 18;
const LANE_GAP = 2;
const LANE_PAD = 4;
const DOT_ZONE = 24;
const LOC_H = 8;

interface Props {
  user: TimelineUser;
  rangeStart: Date;
  rangeEnd: Date;
  timezone: string;
  isLast: boolean;
}

function Tooltip({ event, style, pos }: { event: LifeLogEvent; style: EventStyle; pos: { x: number; y: number } }) {
  const start = format(new Date(event.started_at), "MM/dd HH:mm");
  const end = event.ended_at ? format(new Date(event.ended_at), "MM/dd HH:mm") : null;
  const extra = Object.entries(event.data).map(([k, v]) => `${k}: ${v}`).join(" · ");
  return (
    <div
      className="fixed z-[9999] min-w-max rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl pointer-events-none"
      style={{ left: pos.x + 14, top: pos.y - 56 }}
    >
      <div className="font-semibold">{style.label || event.event_type}</div>
      <div className="text-gray-300 mt-0.5">{start}{end ? ` → ${end}` : " (진행 중)"}</div>
      {extra && <div className="text-gray-400 mt-0.5">{extra}</div>}
    </div>
  );
}

function ContextBar({ event, rangeStart, rangeEnd, topPx }: {
  event: LifeLogEvent; rangeStart: Date; rangeEnd: Date; topPx: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const style = getEventStyle(event.category, event.event_type);
  const { leftPct, widthPct } = positionEvent(event, rangeStart, rangeEnd);
  return (
    <>
      <div
        className={`absolute rounded cursor-pointer opacity-80 hover:opacity-100 transition-opacity ${style.color}`}
        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.6)}%`, top: topPx, height: LANE_H - LANE_GAP }}
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

function EventDot({ event, rangeStart, rangeEnd, centerY }: {
  event: LifeLogEvent; rangeStart: Date; rangeEnd: Date; centerY: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const style = getEventStyle(event.category, event.event_type);
  const { leftPct } = positionEvent(event, rangeStart, rangeEnd);
  const SIZE = 10;
  return (
    <>
      <div
        className={`absolute rounded-full cursor-pointer opacity-85 hover:opacity-100 transition-opacity ring-1 ring-white/40 ${style.color}`}
        style={{ left: `calc(${leftPct}% - ${SIZE / 2}px)`, width: SIZE, height: SIZE, top: centerY - SIZE / 2 }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setPos(null)}
      />
      {pos && <Tooltip event={event} style={style} pos={pos} />}
    </>
  );
}

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

function ApiLine({ event, rangeStart, rangeEnd, rowHeight }: {
  event: LifeLogEvent; rangeStart: Date; rangeEnd: Date; rowHeight: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const style = getEventStyle(event.category, event.event_type);
  const { leftPct } = positionEvent(event, rangeStart, rangeEnd);
  const badge = getApiStatusBadge(event.data.status);
  const lineHeight = rowHeight - LOC_H - 7; // leave room for badge

  return (
    <>
      <div
        className="absolute cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
        style={{ left: `${leftPct}%`, top: 0, width: 14, transform: "translateX(-7px)" }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setPos(null)}
      >
        {/* Vertical line */}
        <div
          className={`mx-auto w-0.5 ${style.color}`}
          style={{ height: lineHeight }}
        />
        {/* Status badge */}
        <div className={`mx-auto w-3.5 h-3.5 rounded-full ${badge.bg} flex items-center justify-center mt-px`}>
          {badge.icon}
        </div>
      </div>
      {pos && <Tooltip event={event} style={style} pos={pos} />}
    </>
  );
}

function LocationBar({ event, rangeStart, rangeEnd, rowHeight }: {
  event: LifeLogEvent; rangeStart: Date; rangeEnd: Date; rowHeight: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const style = getEventStyle(event.category, event.event_type);
  const { leftPct, widthPct } = positionEvent(event, rangeStart, rangeEnd);
  return (
    <>
      <div
        className={`absolute rounded-sm cursor-pointer opacity-80 hover:opacity-100 transition-opacity ${style.color}`}
        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.5)}%`, height: LOC_H, top: rowHeight - LOC_H }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setPos(null)}
      />
      {pos && <Tooltip event={event} style={style} pos={pos} />}
    </>
  );
}

export function UserRow({ user, rangeStart, rangeEnd, timezone, isLast }: Props) {
  const locEvents = user.events.filter((e) => e.category === "location" && e.event_type === "home");
  const ctxEvents = user.events.filter(
    (e) => e.category === "context" || (e.category === "activity" && e.ended_at),
  );
  const dotEvents = user.events.filter(
    (e) => e.category === "event" || (e.category === "activity" && !e.ended_at),
  );
  const apiEvents = user.events.filter((e) => e.category === "api_request");

  const ctxLanes = assignContextLanes(ctxEvents);
  const numLanes = ctxEvents.length > 0 ? Math.max(...Array.from(ctxLanes.values())) + 1 : 1;
  const rowHeight = LANE_PAD + numLanes * LANE_H + DOT_ZONE + LOC_H;
  const dotCenterY = LANE_PAD + numLanes * LANE_H + DOT_ZONE / 2;

  return (
    <div className={`flex ${isLast ? "" : "border-b border-gray-100"}`} style={{ height: rowHeight }}>
      <div className="w-[220px] shrink-0 flex items-center px-3 border-r border-gray-200 bg-gray-50">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2 shrink-0">
          {user.user_name[0]?.toUpperCase()}
        </div>
        <span className="text-sm text-gray-700 truncate">{user.user_name}</span>
      </div>

      <div className="relative flex-1 bg-white">
        {Array.from({ length: 25 }).map((_, h) => (
          <div key={h} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${(h / 24) * 100}%` }} />
        ))}
        <div className="absolute left-0 right-0 border-t border-dashed border-gray-100" style={{ top: LANE_PAD + numLanes * LANE_H }} />

        {ctxEvents.map((ev) => (
          <ContextBar key={ev.id} event={ev} rangeStart={rangeStart} rangeEnd={rangeEnd}
            topPx={LANE_PAD + (ctxLanes.get(ev.id) ?? 0) * LANE_H} />
        ))}
        {dotEvents.map((ev) => (
          <EventDot key={ev.id} event={ev} rangeStart={rangeStart} rangeEnd={rangeEnd} centerY={dotCenterY} />
        ))}
        {apiEvents.map((ev) => (
          <ApiLine key={ev.id} event={ev} rangeStart={rangeStart} rangeEnd={rangeEnd} rowHeight={rowHeight} />
        ))}
        {locEvents.map((ev) => (
          <LocationBar key={ev.id} event={ev} rangeStart={rangeStart} rangeEnd={rangeEnd} rowHeight={rowHeight} />
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Schedule, ScheduleTimelineUser } from "@/domain/scheduleTypes";

const LOCATION_COLORS: Record<string, string> = {
  "우리 집": "bg-blue-400",
  "집": "bg-blue-400",
  "이동 중": "bg-amber-400",
  "이동중": "bg-amber-400",
  "회사": "bg-purple-400",
  "외부": "bg-orange-400",
};

const STATUS_TAG_COLORS: Record<string, string> = {
  "수면": "bg-indigo-100 text-indigo-700",
  "요리": "bg-orange-100 text-orange-700",
  "설거지": "bg-cyan-100 text-cyan-700",
  "청소": "bg-green-100 text-green-700",
  "펫 활동": "bg-pink-100 text-pink-700",
  "펫 수면": "bg-pink-100 text-pink-600",
  "식사": "bg-yellow-100 text-yellow-700",
  "운동": "bg-emerald-100 text-emerald-700",
  "업무": "bg-violet-100 text-violet-700",
  "외출": "bg-rose-100 text-rose-700",
  "귀가": "bg-sky-100 text-sky-700",
};

function getSegmentColor(loc: string, isHome: boolean): string {
  if (isHome) return "bg-blue-200";
  const key = Object.keys(LOCATION_COLORS).find((k) => loc.includes(k)) ?? "";
  return LOCATION_COLORS[key]?.replace("400", "200") ?? "bg-gray-200";
}

/** Returns a fraction [0, 1] for the time position within a 24-hour KST day. */
function datetimeToFraction(dt: string): number {
  const d = new Date(dt);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return (kst.getUTCHours() * 60 + kst.getUTCMinutes()) / (24 * 60);
}

function formatKst(dt: string): string {
  const d = new Date(dt);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}`;
}

interface TooltipState { x: number; y: number; content: React.ReactNode }

function Tooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return (
    <div
      className="fixed z-[9999] rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl pointer-events-none max-w-xs"
      style={{ left: tooltip.x + 14, top: tooltip.y - 60 }}
    >
      {tooltip.content}
    </div>
  );
}

function EntryTooltip({ entry }: { entry: Schedule }) {
  return (
    <div>
      <div className="font-semibold text-white">
        {formatKst(entry.datetime)}
        <span className="ml-2 text-gray-300 font-normal">📍 {entry.location}</span>
      </div>
      <div className="text-gray-200 mt-1 text-xs max-w-[220px] whitespace-normal leading-snug">
        {entry.description}
      </div>
      {entry.status.length > 0 && (
        <div className="mt-1 flex gap-1 flex-wrap">
          {entry.status.map((s) => (
            <span key={s} className="px-1.5 py-0.5 rounded bg-white/20 text-white text-[10px]">{s}</span>
          ))}
        </div>
      )}
      {entry.calls.length > 0 && (
        <div className="mt-1 text-amber-300 text-[10px]">⚡ {entry.calls.length}건 API 호출</div>
      )}
    </div>
  );
}

interface Props {
  user: ScheduleTimelineUser;
  dateInt: number;
  isLast: boolean;
}

export const ScheduleUserRow = React.memo(function ScheduleUserRow({ user, dateInt, isLast }: Props) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const handleHover = useCallback((x: number, y: number, content: React.ReactNode) => setTooltip({ x, y, content }), []);
  const handleLeave = useCallback(() => setTooltip(null), []);

  const dateStr = useMemo(() => String(dateInt), [dateInt]);
  const entries = user.entries;
  const ROW_HEIGHT = 48;

  return (
    <div className={`flex ${isLast ? "" : "border-b border-gray-100"}`} style={{ height: ROW_HEIGHT }}>
      {/* User label */}
      <div className="w-[220px] shrink-0 flex items-center px-3 border-r border-gray-200 bg-gray-50 gap-2">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
          {user.user_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/schedule?userId=${user.user_id}&date=${dateStr}`}
            className="text-sm text-gray-800 font-medium truncate hover:text-indigo-600 transition-colors block"
            title="스케줄 보기"
          >
            {user.user_name}
          </Link>
          {user.user_job && (
            <div className="text-[10px] text-gray-400 truncate">{user.user_job}</div>
          )}
        </div>
        <button
          onClick={() => router.push(`/simulation?userId=${user.user_id}&date=${dateStr}`)}
          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
          title="시뮬레이션 보기"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M3 2.5a.5.5 0 01.763-.424l9 5.5a.5.5 0 010 .848l-9 5.5A.5.5 0 013 13.5v-11z"/>
          </svg>
        </button>
      </div>

      {/* Timeline area */}
      <div className="relative flex-1 bg-white overflow-hidden">
        {Array.from({ length: 25 }).map((_, h) => (
          <div key={h} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${(h / 24) * 100}%` }} />
        ))}

        {/* Segment bars */}
        {entries.map((entry, i) => {
          const startFrac = datetimeToFraction(entry.datetime);
          const nextEntry = entries[i + 1];
          const endFrac = nextEntry ? datetimeToFraction(nextEntry.datetime) : startFrac + 1 / 96;
          const widthPct = Math.max(0, (endFrac - startFrac) * 100);
          if (widthPct <= 0) return null;
          const segColor = getSegmentColor(entry.location, entry.is_home);
          return (
            <div
              key={`seg-${entry.id}`}
              className={`absolute top-1/2 -translate-y-1/2 rounded-sm opacity-60 ${segColor}`}
              style={{ left: `${startFrac * 100}%`, width: `${widthPct}%`, height: 8 }}
            />
          );
        })}

        {/* Entry dots */}
        {entries.map((entry) => {
          const leftPct = datetimeToFraction(entry.datetime) * 100;
          const hasCalls = entry.calls.length > 0;
          const hasStatus = entry.status.length > 0;
          const dotColor = entry.is_home
            ? "bg-blue-500"
            : (Object.entries(LOCATION_COLORS).find(([k]) => entry.location.includes(k))?.[1]?.replace("bg-", "bg-") ?? "bg-gray-500");

          return (
            <div key={`dot-${entry.id}`}>
              <div
                className={`absolute rounded-full cursor-pointer ring-2 ring-white shadow-sm hover:scale-125 transition-transform ${dotColor}`}
                style={{ left: `calc(${leftPct}% - 5px)`, top: "50%", transform: "translateY(-50%)", width: 10, height: 10 }}
                onMouseMove={(e) => handleHover(e.clientX, e.clientY, <EntryTooltip entry={entry} />)}
                onMouseLeave={handleLeave}
              />
              {hasCalls && (
                <div className="absolute text-amber-500 pointer-events-none select-none leading-none"
                  style={{ left: `calc(${leftPct}% - 4px)`, top: 4, fontSize: 10 }}>⚡</div>
              )}
              {hasStatus && (
                <div className="absolute pointer-events-none select-none" style={{ left: `calc(${leftPct}% + 7px)`, bottom: 4 }}>
                  <span className={`text-[9px] px-1 py-0 rounded leading-none font-medium ${STATUS_TAG_COLORS[entry.status[0]] ?? "bg-gray-100 text-gray-500"}`}>
                    {entry.status[0]}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <Tooltip tooltip={tooltip} />
      </div>
    </div>
  );
});

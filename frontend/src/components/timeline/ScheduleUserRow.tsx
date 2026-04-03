"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Zap } from "lucide-react";
import type { Schedule, ScheduleTimelineDisplayFilter, ScheduleTimelineUser } from "@/domain/scheduleTypes";

// ── Semantic color palette (location type → color token) ─────────────────────

type SegmentType = "home" | "away" | "transit" | "work";

const SEGMENT_PALETTE: Record<SegmentType, { bar: string; dot: string; label: string }> = {
  home:    { bar: "bg-indigo-400/40",  dot: "bg-indigo-500",   label: "text-indigo-700" },
  away:    { bar: "bg-neutral-300/60", dot: "bg-neutral-400",   label: "text-neutral-600" },
  transit: { bar: "bg-amber-400/40",   dot: "bg-amber-500",    label: "text-amber-700" },
  work:    { bar: "bg-violet-400/40",  dot: "bg-violet-500",   label: "text-violet-700" },
};

// Status → semantic colors (muted, professional)
const STATUS_STYLES: Record<string, string> = {
  "수면":   "bg-slate-100 text-slate-500 border-slate-200",
  "요리":   "bg-orange-50 text-orange-600 border-orange-200",
  "설거지": "bg-sky-50 text-sky-600 border-sky-200",
  "청소":   "bg-emerald-50 text-emerald-600 border-emerald-200",
  "식사":   "bg-yellow-50 text-yellow-600 border-yellow-200",
  "운동":   "bg-green-50 text-green-600 border-green-200",
  "업무":   "bg-violet-50 text-violet-600 border-violet-200",
  "외출":   "bg-rose-50 text-rose-600 border-rose-200",
  "귀가":   "bg-teal-50 text-teal-600 border-teal-200",
  "재실":   "bg-indigo-50 text-indigo-500 border-indigo-200",
  "부재":   "bg-neutral-50 text-neutral-400 border-neutral-200",
  "펫 활동": "bg-pink-50 text-pink-600 border-pink-200",
};

function getSegmentType(location: string, isHome: boolean): SegmentType {
  if (!isHome) {
    if (location.includes("이동") || location.includes("출근") || location.includes("귀가")) return "transit";
    if (location.includes("회사") || location.includes("사무")) return "work";
    return "away";
  }
  return "home";
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function datetimeToRangeFraction(dt: string, rangeStart: Date, rangeEnd: Date): number {
  const t = new Date(dt).getTime();
  const total = rangeEnd.getTime() - rangeStart.getTime();
  if (total <= 0) return 0;
  return clamp01((t - rangeStart.getTime()) / total);
}

function formatKst(dt: string): string {
  const d = new Date(dt);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}`;
}

// ── Activity density heatmap (24 hourly buckets) ──────────────────────────────

function buildDensityMap(entries: Schedule[]): number[] {
  const slots = new Array(24).fill(0);
  for (const e of entries) {
    const d = new Date(e.datetime);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const h = kst.getUTCHours();
    slots[h]++;
  }
  return slots;
}

const DensityHeatmap = React.memo(function DensityHeatmap({ density }: { density: number[] }) {
  const maxVal = Math.max(...density, 1);
  return (
    <div className="absolute bottom-0 left-0 right-0 flex h-[6px]">
      {density.map((count, h) => {
        const intensity = count / maxVal;
        return (
          <div
            key={h}
            className="flex-1"
            style={{
              backgroundColor: count > 0
                ? `rgba(99,102,241,${0.15 + intensity * 0.65})`
                : "transparent",
            }}
            title={`${h}시: ${count}건`}
          />
        );
      })}
    </div>
  );
});

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState { x: number; y: number; content: React.ReactNode }

function Tooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return (
    <div
      className="fixed z-[9999] rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-neutral-100 shadow-2xl pointer-events-none max-w-xs"
      style={{ left: tooltip.x + 14, top: tooltip.y - 64 }}
    >
      {tooltip.content}
    </div>
  );
}

function EntryTooltipContent({ entry }: { entry: Schedule }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-indigo-300 font-semibold">{formatKst(entry.datetime)}</span>
        {entry.location && (
          <span className="text-neutral-400 text-[10px] truncate max-w-[140px]">{entry.location}</span>
        )}
      </div>
      <div className="text-neutral-200 text-xs leading-snug max-w-[220px]">{entry.description}</div>
      {entry.status.length > 0 && (
        <div className="flex gap-1 flex-wrap pt-0.5">
          {entry.status.map((s) => (
            <span key={s} className="px-1.5 py-px rounded-sm bg-neutral-700 text-neutral-300 text-[10px]">{s}</span>
          ))}
        </div>
      )}
      {entry.calls.length > 0 && (
        <div className="flex items-center gap-1 text-amber-400 text-[10px] pt-0.5">
          <Zap className="w-2.5 h-2.5" />
          <span>{entry.calls.length}건 API 호출</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  user: ScheduleTimelineUser;
  dateInt: number;
  rangeStart: Date;
  rangeEnd: Date;
  days: number;
  displayFilter: ScheduleTimelineDisplayFilter;
  isLast: boolean;
}

const ROW_HEIGHT = 56;

export const ScheduleUserRow = React.memo(function ScheduleUserRow({
  user,
  dateInt,
  rangeStart,
  rangeEnd,
  days,
  displayFilter,
  isLast,
}: Props) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const handleHover = useCallback((x: number, y: number, content: React.ReactNode) =>
    setTooltip({ x, y, content }), []);
  const handleLeave = useCallback(() => setTooltip(null), []);

  const dateStr = useMemo(() => String(dateInt), [dateInt]);
  const entries = user.entries;

  const density = useMemo(() => buildDensityMap(entries), [entries]);
  const totalMs = useMemo(() => Math.max(1, rangeEnd.getTime() - rangeStart.getTime()), [rangeEnd, rangeStart]);

  // Current-hour marker
  const nowFrac = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    if (nowMs < rangeStart.getTime() || nowMs >= rangeEnd.getTime()) return -1;
    return (nowMs - rangeStart.getTime()) / totalMs;
  }, [rangeEnd, rangeStart, totalMs]);

  return (
    <div
      className={`flex ${isLast ? "" : "border-b border-neutral-100"} bg-white`}
      style={{ height: ROW_HEIGHT }}
    >
      {/* User label */}
      <div className="w-[220px] shrink-0 flex items-center px-3 border-r border-neutral-200 bg-neutral-50 gap-2.5">
        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold shrink-0">
          {user.user_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/schedule?userId=${user.user_id}&date=${dateStr}`}
            className="text-sm text-neutral-800 font-medium truncate hover:text-indigo-600 transition-colors block leading-tight"
          >
            {user.user_name}
          </Link>
          {user.user_job && (
            <div className="text-[11px] text-neutral-400 truncate leading-tight mt-0.5">{user.user_job}</div>
          )}
        </div>
        <button
          onClick={() => router.push(`/simulation?userId=${user.user_id}&date=${dateStr}`)}
          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="시뮬레이션 보기"
        >
          <Play className="w-3 h-3" />
        </button>
      </div>

      {/* Timeline area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Grid lines */}
        {displayFilter.showGridLines &&
          Array.from({ length: days <= 1 ? 25 : days + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0"
              style={{
                left: `${days <= 1 ? (i / 24) * 100 : (i / days) * 100}%`,
                borderLeft: days <= 1 && i % 6 === 0 ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(0,0,0,0.04)",
              }}
            />
          ))}

        {/* Now indicator */}
        {displayFilter.showNowLine && nowFrac > 0 && nowFrac < 1 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-400/50 z-10 pointer-events-none"
            style={{ left: `${nowFrac * 100}%` }}
          />
        )}

        {/* Segment bars (presence track) */}
        {displayFilter.showPresenceBars &&
          entries.map((entry, i) => {
            const startFrac = datetimeToRangeFraction(entry.datetime, rangeStart, rangeEnd);
            const nextEntry = entries[i + 1];
            const endFrac = nextEntry
              ? datetimeToRangeFraction(nextEntry.datetime, rangeStart, rangeEnd)
              : clamp01(startFrac + (5 * 60 * 1000) / totalMs);
            const widthPct = Math.max(0, (endFrac - startFrac) * 100);
            if (widthPct <= 0) return null;
            const segType = getSegmentType(entry.location, entry.is_home);
            const palette = SEGMENT_PALETTE[segType];
            return (
              <div
                key={`seg-${entry.id}`}
                className={`absolute rounded-sm ${palette.bar}`}
                style={{ left: `${startFrac * 100}%`, width: `${widthPct}%`, height: 10, top: 18 }}
              />
            );
          })}

        {/* Entry dots + status labels (same status as previous → no repeat label, connector + smaller marker) */}
        {displayFilter.showEntryDots &&
          entries.map((entry, i) => {
            const leftPct = datetimeToRangeFraction(entry.datetime, rangeStart, rangeEnd) * 100;
            const prevEntry = i > 0 ? entries[i - 1] : null;
            const prevLeftPct = prevEntry
              ? datetimeToRangeFraction(prevEntry.datetime, rangeStart, rangeEnd) * 100
              : 0;
            const hasCalls = entry.calls.length > 0;
            const segType = getSegmentType(entry.location, entry.is_home);
            const palette = SEGMENT_PALETTE[segType];
            const statusKey = entry.status[0];
            const prevStatusKey = prevEntry?.status[0];
            const statusContinues = Boolean(statusKey && prevStatusKey === statusKey);
            const statusStyle = statusKey ? (STATUS_STYLES[statusKey] ?? "bg-neutral-100 text-neutral-500 border-neutral-200") : null;
            const showStatusTag = Boolean(displayFilter.showStatusTags && statusStyle && !statusContinues);

            const lo = Math.min(prevLeftPct, leftPct);
            const span = Math.abs(leftPct - prevLeftPct);

            return (
              <React.Fragment key={`dot-${entry.id}`}>
                {statusContinues && span > 0 && (
                  <div
                    className="absolute h-[3px] rounded-full bg-neutral-400/35 pointer-events-none z-[1]"
                    style={{
                      left: `${lo}%`,
                      width: `${span}%`,
                      top: 22,
                    }}
                    aria-hidden
                  />
                )}
                {/* Dot */}
                <div
                  className={
                    statusContinues
                      ? `absolute rounded-full cursor-pointer ring-1 ring-white/90 shadow-sm hover:ring-indigo-300 hover:scale-125 transition-transform opacity-75 ${palette.dot}`
                      : `absolute rounded-full cursor-pointer ring-[1.5px] ring-white shadow-sm hover:ring-indigo-300 hover:scale-125 transition-transform ${palette.dot}`
                  }
                  style={
                    statusContinues
                      ? { left: `calc(${leftPct}% - 3px)`, top: 21, width: 6, height: 6 }
                      : { left: `calc(${leftPct}% - 4px)`, top: 20, width: 8, height: 8 }
                  }
                  onMouseMove={(e) => handleHover(e.clientX, e.clientY, <EntryTooltipContent entry={entry} />)}
                  onMouseLeave={handleLeave}
                />
                {/* API call indicator */}
                {displayFilter.showApiCallMarkers && hasCalls && (
                  <div
                    className="absolute pointer-events-none"
                    style={{ left: `calc(${leftPct}% - ${statusContinues ? 3 : 4}px)`, top: 5 }}
                  >
                    <Zap className="w-2.5 h-2.5 text-amber-500" />
                  </div>
                )}
                {/* Status tag — only at start of a same-status run */}
                {showStatusTag && (
                  <div
                    className={`absolute pointer-events-none px-1 py-px rounded-sm border text-[9px] font-medium leading-none ${statusStyle}`}
                    style={{ left: `calc(${leftPct}% + 6px)`, bottom: 10 }}
                  >
                    {statusKey}
                  </div>
                )}
              </React.Fragment>
            );
          })}

        {/* Density heatmap strip at bottom (single-day only) */}
        {days === 1 && displayFilter.showActivityHeatmap && <DensityHeatmap density={density} />}

        <Tooltip tooltip={tooltip} />
      </div>
    </div>
  );
});

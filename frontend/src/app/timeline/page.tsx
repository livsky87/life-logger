"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, subDays, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useIsClientCalendarToday } from "@/lib/useClientToday";
import { ScheduleTimelineGrid } from "@/components/timeline/ScheduleTimelineGrid";
import { ScheduleTimelineFilterPanel } from "@/components/timeline/ScheduleTimelineFilterPanel";
import { defaultScheduleTimelineDisplayFilter } from "@/domain/scheduleTypes";

function dateToInt(d: Date): number {
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
}

function intToDate(n: number): Date {
  const s = String(n);
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
}

function clampDays(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(31, Math.floor(n)));
}

function TimelineContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initDateInt = useMemo(() => {
    const d = searchParams.get("date");
    return d ? Number(d) : dateToInt(startOfDay(new Date()));
  }, []);

  const [dateInt, setDateInt] = useState(initDateInt);
  const [days, setDays] = useState(() => clampDays(Number(searchParams.get("days") ?? "1")));
  const [displayFilter, setDisplayFilter] = useState(defaultScheduleTimelineDisplayFilter);

  useEffect(() => {
    router.replace(`/timeline?date=${dateInt}&days=${days}`, { scroll: false });
  }, [dateInt, days, router]);

  const handleShift = useCallback((dir: 1 | -1) => {
    setDateInt((prev) => {
      const d = intToDate(prev);
      return dateToInt(dir > 0 ? addDays(d, days) : subDays(d, days));
    });
  }, [days]);

  const handleToday = useCallback(() => {
    setDateInt(dateToInt(startOfDay(new Date())));
  }, []);

  const currentDate = useMemo(() => intToDate(dateInt), [dateInt]);
  const dateLabel = useMemo(() =>
    format(currentDate, "yyyy년 M월 d일", { locale: ko }), [currentDate]);
  const dayLabel = useMemo(() =>
    format(currentDate, "EEE", { locale: ko }), [currentDate]);
  const isTodayDate = useIsClientCalendarToday(currentDate);
  const rangeLabel = days === 1 ? "1일" : `${days}일`;

  return (
    <div className="flex h-full flex-col bg-zinc-100/90 dark:bg-zinc-950/40">
      <div className="relative z-30 flex shrink-0 items-center gap-4 border-b border-zinc-200/90 bg-white/90 px-6 py-4 shadow-sm backdrop-blur-sm dark:border-zinc-800/90 dark:bg-zinc-900/85">
        <div>
          <h1 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            스케줄 타임라인
          </h1>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">{dateLabel}</span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{rangeLabel}</span>
            <span
              className={`rounded-md px-2 py-0.5 text-sm font-medium tabular-nums ${
                isTodayDate
                  ? "bg-cyan-500/15 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {dayLabel}
              {isTodayDate && " · 오늘"}
            </span>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <ScheduleTimelineFilterPanel filter={displayFilter} onChange={setDisplayFilter} />
          <label className="flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            <span>범위</span>
            <select
              value={days}
              onChange={(e) => setDays(clampDays(Number(e.target.value)))}
              className="bg-transparent text-zinc-800 outline-none dark:text-zinc-200"
            >
              {[1, 7, 14, 30, 31].map((d) => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
          </label>
          {!isTodayDate && (
            <button
              onClick={handleToday}
              className="flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              오늘
            </button>
          )}
          <div className="flex items-center overflow-hidden rounded border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => handleShift(-1)}
              className="border-r border-zinc-200 p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleShift(1)}
              className="p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline content */}
      <div className="relative z-0 flex-1 overflow-auto p-5 md:p-6">
        <ScheduleTimelineGrid dateInt={dateInt} days={days} displayFilter={displayFilter} />
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={null}>
      <TimelineContent />
    </Suspense>
  );
}

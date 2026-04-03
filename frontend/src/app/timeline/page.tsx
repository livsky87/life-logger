"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, subDays, startOfDay, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
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
  const isTodayDate = isToday(currentDate);
  const rangeLabel = days === 1 ? "1일" : `${days}일`;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-neutral-200 shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider leading-none mb-1">
            Timeline
          </h1>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-neutral-900">{dateLabel}</span>
            <span className="text-sm font-medium text-neutral-500">{rangeLabel}</span>
            <span className={`text-sm font-medium px-1.5 py-0.5 rounded ${isTodayDate ? "bg-indigo-100 text-indigo-700" : "text-neutral-400"}`}>
              {dayLabel}{isTodayDate && " · 오늘"}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ScheduleTimelineFilterPanel filter={displayFilter} onChange={setDisplayFilter} />
          <label className="flex items-center gap-1.5 px-2 py-1.5 border border-neutral-200 rounded text-xs text-neutral-600 bg-white">
            <span>범위</span>
            <select
              value={days}
              onChange={(e) => setDays(clampDays(Number(e.target.value)))}
              className="bg-transparent text-neutral-700 outline-none"
            >
              {[1, 7, 14, 30, 31].map((d) => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
          </label>
          {!isTodayDate && (
            <button
              onClick={handleToday}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              오늘
            </button>
          )}
          <div className="flex items-center border border-neutral-200 rounded overflow-hidden">
            <button
              onClick={() => handleShift(-1)}
              className="p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors border-r border-neutral-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleShift(1)}
              className="p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-auto p-5">
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

"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, subDays, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { ScheduleTimelineGrid } from "@/components/timeline/ScheduleTimelineGrid";

function dateToInt(d: Date): number {
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
}

function intToDate(n: number): Date {
  const s = String(n);
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
}

function TimelineContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initDateInt = useMemo(() => {
    const d = searchParams.get("date");
    return d ? Number(d) : dateToInt(startOfDay(new Date()));
  }, []);

  const [dateInt, setDateInt] = useState(initDateInt);

  useEffect(() => {
    router.replace(`/timeline?date=${dateInt}`, { scroll: false });
  }, [dateInt, router]);

  const handleShift = useCallback((dir: 1 | -1) => {
    setDateInt((prev) => {
      const d = intToDate(prev);
      return dateToInt(dir > 0 ? addDays(d, 1) : subDays(d, 1));
    });
  }, []);

  const handleToday = useCallback(() => {
    setDateInt(dateToInt(startOfDay(new Date())));
  }, []);

  const dateLabel = useMemo(() => {
    if (!dateInt) return "";
    return format(intToDate(dateInt), "yyyy년 M월 d일 (EEE)", { locale: ko });
  }, [dateInt]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-lg font-bold text-gray-900">타임라인</h1>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleShift(-1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition"
          >
            오늘
          </button>
          <button
            onClick={() => handleShift(1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <span className="text-sm font-medium text-gray-700">{dateLabel}</span>
      </div>

      <ScheduleTimelineGrid dateInt={dateInt} />
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

"use client";

import { useState, useCallback, useMemo } from "react";
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
         startOfWeek, startOfMonth, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { useLocations } from "@/application/useLocations";
import { TimelineGrid } from "@/components/timeline/TimelineGrid";

type Period = "1d" | "1w" | "1m";

const PERIOD_LABELS: Record<Period, string> = { "1d": "1일", "1w": "1주일", "1m": "1달" };

function getRangeEnd(start: Date, period: Period): Date {
  if (period === "1d") return addDays(start, 1);
  if (period === "1w") return addDays(start, 7);
  return addMonths(start, 1);
}

function shiftStart(start: Date, period: Period, dir: 1 | -1): Date {
  if (period === "1d") return dir > 0 ? addDays(start, 1) : subDays(start, 1);
  if (period === "1w") return dir > 0 ? addWeeks(start, 1) : subWeeks(start, 1);
  return dir > 0 ? addMonths(start, 1) : subMonths(start, 1);
}

function todayStart(period: Period): Date {
  const now = new Date();
  if (period === "1d") return startOfDay(now);
  if (period === "1w") return startOfWeek(now, { weekStartsOn: 1 });
  return startOfMonth(now);
}

function formatRangeLabel(start: Date, end: Date, period: Period): string {
  if (period === "1d") return format(start, "yyyy년 M월 d일 (EEE)", { locale: ko });
  if (period === "1w")
    return `${format(start, "yyyy년 M월 d일", { locale: ko })} ~ ${format(subDays(end, 1), "M월 d일", { locale: ko })}`;
  return format(start, "yyyy년 M월", { locale: ko });
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("1d");
  const [rangeStart, setRangeStart] = useState<Date>(() => startOfDay(new Date()));
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const { data: locations } = useLocations();

  const rangeEnd = useMemo(() => getRangeEnd(rangeStart, period), [rangeStart, period]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setRangeStart(todayStart(p));
  }, []);

  const handleShift = useCallback((dir: 1 | -1) => {
    setRangeStart((s) => shiftStart(s, period, dir));
  }, [period]);

  const handleToday = useCallback(() => {
    setRangeStart(todayStart(period));
  }, [period]);

  const toggleLocation = useCallback((id: string) => {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }, []);

  const activeLocations = selectedLocations.length > 0 ? selectedLocations : [];

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Period selector */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                period === p
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Navigation */}
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

        {/* Range label */}
        <span className="text-sm font-medium text-gray-700">
          {formatRangeLabel(rangeStart, rangeEnd, period)}
        </span>

        {/* Location filter */}
        {locations && locations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {locations.map((loc) => {
              const active = selectedLocations.includes(loc.id);
              return (
                <button
                  key={loc.id}
                  onClick={() => toggleLocation(loc.id)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition ${
                    active
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {loc.name}
                </button>
              );
            })}
            {selectedLocations.length > 0 && (
              <button onClick={() => setSelectedLocations([])} className="text-xs text-gray-400 hover:text-gray-600 underline">
                전체
              </button>
            )}
          </div>
        )}
      </div>

      <TimelineGrid rangeStart={rangeStart} rangeEnd={rangeEnd} locationIds={activeLocations} />
    </div>
  );
}

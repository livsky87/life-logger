"use client";

import { useState, useCallback } from "react";
import { format, addDays, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import { useLocations } from "@/application/useLocations";
import { TimelineGrid } from "@/components/timeline/TimelineGrid";

export default function DashboardPage() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const { data: locations } = useLocations();

  const goDay = useCallback((delta: number) => {
    setDate((d) => format(delta > 0 ? addDays(new Date(d), 1) : subDays(new Date(d), 1), "yyyy-MM-dd"));
  }, []);

  const toggleLocation = useCallback((id: string) => {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }, []);

  const activeLocations = selectedLocations.length > 0 ? selectedLocations : [];

  return (
    <div className="p-6">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goDay(-1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => goDay(1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition"
          >
            오늘
          </button>
        </div>

        {/* Location filter pills */}
        {locations && locations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">위치 필터:</span>
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
              <button
                onClick={() => setSelectedLocations([])}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                전체 보기
              </button>
            )}
          </div>
        )}

        {/* Date label */}
        <div className="ml-auto text-sm text-gray-500">
          {format(new Date(date + "T00:00:00"), "yyyy년 M월 d일 (EEE)", { locale: ko })}
        </div>
      </div>

      {/* Gantt timeline */}
      <TimelineGrid date={date} locationIds={activeLocations} />
    </div>
  );
}

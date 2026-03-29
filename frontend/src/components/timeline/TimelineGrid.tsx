"use client";

import { useTimeline } from "@/application/useTimeline";
import { LocationGroup } from "./LocationGroup";

interface TimelineGridProps {
  date: string;
  locationIds: string[];
}

export function TimelineGrid({ date, locationIds }: TimelineGridProps) {
  const { data, isLoading, isError, error } = useTimeline(date, locationIds);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        불러오는 중...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        오류: {error instanceof Error ? error.message : "데이터를 불러올 수 없습니다"}
      </div>
    );
  }

  if (!data || data.locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        선택한 날짜에 기록이 없습니다
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <LegendItem color="bg-blue-500" label="집" />
        <LegendItem color="bg-indigo-500" label="회사" />
        <LegendItem color="bg-sky-400" label="외출" />
        <div className="w-px bg-gray-200 mx-1" />
        <LegendItem color="bg-cyan-400" label="세탁기" />
        <LegendItem color="bg-teal-400" label="냉장고" />
        <LegendItem color="bg-purple-500" label="TV" />
        <LegendItem color="bg-slate-500" label="수면" />
        <div className="w-px bg-gray-200 mx-1" />
        <LegendItem color="bg-emerald-500" label="GET" />
        <LegendItem color="bg-amber-500" label="POST" />
        <LegendItem color="bg-red-500" label="DELETE" />
      </div>

      {/* Timeline groups */}
      {data.locations.map((location) => (
        <LocationGroup key={location.location_id} location={location} />
      ))}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-3 h-3 rounded ${color}`} />
      <span className="text-gray-600">{label}</span>
    </div>
  );
}

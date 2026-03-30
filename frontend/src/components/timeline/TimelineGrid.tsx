"use client";

import { useTimeline } from "@/application/useTimeline";
import { LocationGroup } from "./LocationGroup";
import { format } from "date-fns";
import type { TimelineFilter } from "@/domain/types";

interface TimelineGridProps {
  rangeStart: Date;
  rangeEnd: Date;
  locationIds: string[];
  filter: TimelineFilter;
}

export function TimelineGrid({ rangeStart, rangeEnd, locationIds, filter }: TimelineGridProps) {
  const start = format(rangeStart, "yyyy-MM-dd");
  const end = format(rangeEnd, "yyyy-MM-dd");
  const { data, isLoading, isError, error } = useTimeline(start, end, locationIds, filter);

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
        선택한 기간에 기록이 없습니다
      </div>
    );
  }

  return (
    <div>
      {data.locations.map((location) => (
        <LocationGroup
          key={location.location_id}
          location={location}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          filter={filter}
        />
      ))}
    </div>
  );
}

"use client";

import { useLocations } from "@/application/useLocations";
import { LazyLocationGroup } from "./LazyLocationGroup";
import { differenceInDays, format } from "date-fns";
import type { Period, TimelineFilter } from "@/domain/types";

interface TimelineGridProps {
  rangeStart: Date;
  rangeEnd: Date;
  locationIds: string[];
  period: Period;
  filter: TimelineFilter;
}

function dateToInt(d: Date): number {
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
}

export function TimelineGrid({ rangeStart, rangeEnd, locationIds, period, filter }: TimelineGridProps) {
  const start = format(rangeStart, "yyyy-MM-dd");
  const end = format(rangeEnd, "yyyy-MM-dd");
  const { data: allLocations, isLoading } = useLocations();

  const isSingleDay = differenceInDays(rangeEnd, rangeStart) <= 1;
  const dateInt = isSingleDay ? dateToInt(rangeStart) : 0;

  const locations = (allLocations ?? []).filter(
    (loc) => locationIds.length === 0 || locationIds.includes(loc.id)
  );

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

  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        {allLocations && allLocations.length > 0
          ? "선택한 위치가 없습니다"
          : "등록된 위치가 없습니다"}
      </div>
    );
  }

  return (
    <div>
      {locations.map((location) => (
        <LazyLocationGroup
          key={location.id}
          location={location}
          start={start}
          end={end}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          period={period}
          filter={filter}
          dateInt={dateInt}
        />
      ))}
    </div>
  );
}

"use client";

import { useQueries } from "@tanstack/react-query";
import { useTimeline } from "@/application/useTimeline";
import { fetchSchedules } from "@/infrastructure/api/scheduleApi";
import { LocationGroup } from "./LocationGroup";
import { differenceInDays, format } from "date-fns";
import type { Schedule } from "@/domain/scheduleTypes";

interface TimelineGridProps {
  rangeStart: Date;
  rangeEnd: Date;
  locationIds: string[];
}

function dateToInt(d: Date): number {
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
}

export function TimelineGrid({ rangeStart, rangeEnd, locationIds }: TimelineGridProps) {
  const start = format(rangeStart, "yyyy-MM-dd");
  const end = format(rangeEnd, "yyyy-MM-dd");
  const { data, isLoading, isError, error } = useTimeline(start, end, locationIds);

  const isSingleDay = differenceInDays(rangeEnd, rangeStart) <= 1;
  const dateInt = isSingleDay ? dateToInt(rangeStart) : 0;

  // Collect user IDs from all locations for per-user schedule queries
  const userIds: string[] = isSingleDay
    ? (data?.locations.flatMap((loc) => loc.users.map((u) => u.user_id)) ?? [])
    : [];

  // Fetch schedules per user in parallel — only in single-day view
  const scheduleQueries = useQueries({
    queries: userIds.map((uid) => ({
      queryKey: ["schedules", dateInt, uid] as const,
      queryFn: () => fetchSchedules(dateInt, uid),
      enabled: isSingleDay && !!uid && !!dateInt,
      staleTime: 30_000,
    })),
  });

  // Build a map: userId → Schedule[]
  const scheduleByUser: Record<string, Schedule[]> = {};
  userIds.forEach((uid, i) => {
    scheduleByUser[uid] = scheduleQueries[i]?.data ?? [];
  });

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
          scheduleByUser={isSingleDay ? scheduleByUser : {}}
        />
      ))}
    </div>
  );
}

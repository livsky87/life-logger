"use client";

import { useRef, useEffect, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { LocationGroup } from "./LocationGroup";
import { fetchTimeline } from "@/infrastructure/api/lifeLogApi";
import { fetchSchedules } from "@/infrastructure/api/scheduleApi";
import type { Location, TimelineLocation, Period, TimelineFilter } from "@/domain/types";
import type { Schedule } from "@/domain/scheduleTypes";

const PERIOD_QUERY_CONFIG: Record<Period, { staleTime: number; refetchInterval: number | false }> = {
  "1d": { staleTime: 30_000,       refetchInterval: 60_000 },
  "1w": { staleTime: 5 * 60_000,  refetchInterval: 5 * 60_000 },
  "1m": { staleTime: 15 * 60_000, refetchInterval: false },
};

interface Props {
  location: Location;
  start: string;
  end: string;
  rangeStart: Date;
  rangeEnd: Date;
  period: Period;
  filter: TimelineFilter;
  /** YYYYMMDD integer for schedule fetching — 0 disables */
  dateInt: number;
}

export function LazyLocationGroup({ location, start, end, rangeStart, rangeEnd, period, filter, dateInt }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const config = PERIOD_QUERY_CONFIG[period];
  const isSingleDay = period === "1d";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" } // 300px 앞당겨 미리 로드
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["timeline", location.id, start, end, period],
    queryFn: () => fetchTimeline(start, end, [location.id], period),
    enabled: isVisible,
    staleTime: config.staleTime,
    refetchInterval: config.refetchInterval,
  });

  const locationData: TimelineLocation | undefined = data?.locations[0];

  // Collect user IDs once we have location data (single-day view only)
  const userIds: string[] = (isSingleDay && locationData)
    ? locationData.users.map((u) => u.user_id)
    : [];

  // Fetch schedules per user in parallel — only in single-day view, after location data arrives
  const scheduleQueries = useQueries({
    queries: userIds.map((uid) => ({
      queryKey: ["schedules", dateInt, uid] as const,
      queryFn: () => fetchSchedules(dateInt, uid),
      enabled: isSingleDay && !!uid && !!dateInt && !!locationData,
      staleTime: 30_000,
    })),
  });

  // Build a map: userId → Schedule[]
  const scheduleByUser: Record<string, Schedule[]> = {};
  userIds.forEach((uid, i) => {
    scheduleByUser[uid] = scheduleQueries[i]?.data ?? [];
  });

  return (
    <div ref={ref}>
      {!isVisible || isLoading ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
          <div className="h-9 bg-gray-800 flex items-center px-3 gap-2">
            <span className="text-sm font-semibold text-white truncate">{location.name}</span>
            {isVisible && isLoading && (
              <svg className="animate-spin w-3.5 h-3.5 ml-auto text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
          </div>
          {isVisible && isLoading && (
            <div className="h-10" />
          )}
        </div>
      ) : locationData ? (
        <LocationGroup
          location={locationData}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          filter={filter}
          scheduleByUser={isSingleDay ? scheduleByUser : {}}
        />
      ) : (
        <LocationGroup
          location={{ location_id: location.id, name: location.name, timezone: location.timezone, users: [] }}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          filter={filter}
          scheduleByUser={{}}
        />
      )}
    </div>
  );
}

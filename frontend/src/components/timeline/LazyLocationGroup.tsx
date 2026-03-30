"use client";

import { useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LocationGroup } from "./LocationGroup";
import { fetchTimeline } from "@/infrastructure/api/lifeLogApi";
import type { Location, TimelineLocation, Period } from "@/domain/types";

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
}

export function LazyLocationGroup({ location, start, end, rangeStart, rangeEnd, period }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const config = PERIOD_QUERY_CONFIG[period];

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
    queryKey: ["timeline", location.id, start, end],
    queryFn: () => fetchTimeline(start, end, [location.id]),
    enabled: isVisible,
    staleTime: config.staleTime,
    refetchInterval: config.refetchInterval,
  });

  const locationData: TimelineLocation | undefined = data?.locations[0];

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
        <LocationGroup location={locationData} rangeStart={rangeStart} rangeEnd={rangeEnd} />
      ) : (
        <LocationGroup
          location={{ location_id: location.id, name: location.name, timezone: location.timezone, users: [] }}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      )}
    </div>
  );
}

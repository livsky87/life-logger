"use client";

import { useState } from "react";
import { MapPin, ChevronDown, ChevronRight, Users } from "lucide-react";
import { useScheduleTimeline } from "@/application/useSchedules";
import type { ScheduleTimelineDisplayFilter } from "@/domain/scheduleTypes";
import { ScheduleUserRow } from "./ScheduleUserRow";
import { getTimeTicks } from "./timelineUtils";

interface Props {
  dateInt: number;
  days: number;
  displayFilter: ScheduleTimelineDisplayFilter;
  locationId?: string;
}

function dateIntToDate(n: number): Date {
  const s = String(n);
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
}

function LocationBlock({
  location,
  dateInt,
  rangeStart,
  rangeEnd,
  days,
  displayFilter,
}: {
  location: { location_id: string; name: string; timezone: string; users: any[] };
  dateInt: number;
  rangeStart: Date;
  rangeEnd: Date;
  days: number;
  displayFilter: ScheduleTimelineDisplayFilter;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const ticks = getTimeTicks(rangeStart, rangeEnd, location.timezone);

  return (
    <div className="mb-3 rounded-md overflow-hidden border border-neutral-200 shadow-sm bg-white">
      {/* Location header */}
      <div className="flex h-10 bg-neutral-900 text-white items-center select-none">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-[220px] shrink-0 flex items-center gap-2 px-3 h-full border-r border-neutral-700 hover:bg-neutral-800 transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
            : <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
          }
          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-sm font-medium truncate text-neutral-100">{location.name}</span>
          <div className="ml-auto flex items-center gap-1 text-neutral-500">
            <Users className="w-3 h-3" />
            <span className="text-xs">{location.users.length}</span>
          </div>
        </button>

        {/* Time axis */}
        <div className="relative flex-1 h-full">
          {displayFilter.showHeaderTicks &&
            ticks.map((tick) => (
              <div
                key={tick.pct}
                className="absolute top-0 h-full flex flex-col items-center justify-end pb-1.5"
                style={{ left: `${tick.pct}%` }}
              >
                <div className="w-px h-2.5 bg-neutral-700 mb-0.5" />
                <span className="text-[10px] text-neutral-500 font-mono whitespace-nowrap translate-x-1">
                  {tick.label}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* User rows */}
      {!collapsed &&
        location.users.map((user, idx) => (
          <ScheduleUserRow
            key={user.user_id}
            user={user}
            dateInt={dateInt}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            days={days}
            displayFilter={displayFilter}
            isLast={idx === location.users.length - 1}
          />
        ))}

      {!collapsed && location.users.length === 0 && (
        <div className="h-12 flex items-center justify-center text-sm text-neutral-400">
          이 날짜에 스케줄 데이터가 없습니다
        </div>
      )}
    </div>
  );
}

export function ScheduleTimelineGrid({ dateInt, days, displayFilter, locationId }: Props) {
  const { data, isLoading, isError, error } = useScheduleTimeline(dateInt, days, locationId);
  const rangeStart = dateIntToDate(dateInt);
  const rangeEnd = new Date(rangeStart.getTime() + days * 24 * 60 * 60 * 1000);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400 gap-2">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-sm">불러오는 중…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        {error instanceof Error ? error.message : "데이터를 불러올 수 없습니다"}
      </div>
    );
  }

  if (!data || data.locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 gap-3">
        <svg className="w-10 h-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-600">선택한 기간에 스케줄 데이터가 없습니다</p>
          <p className="text-xs text-neutral-400 mt-1">스케줄을 업로드하거나 직접 입력하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {data.locations.map((loc) => (
        <LocationBlock
          key={loc.location_id}
          location={loc}
          dateInt={dateInt}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          days={days}
          displayFilter={displayFilter}
        />
      ))}
    </div>
  );
}

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
    <div className="mb-4 overflow-visible rounded-lg border border-stone-200/90 bg-white shadow-sm ring-1 ring-stone-900/[0.04]">
      {/* Location header */}
      <div className="flex h-11 select-none items-center bg-gradient-to-b from-stone-900 to-stone-950 text-white">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-full w-[220px] shrink-0 items-center gap-2 border-r border-white/10 px-3 transition-colors hover:bg-white/5"
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-500" />
            : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-stone-500" />
          }
          <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
          <span className="truncate text-sm font-semibold tracking-tight text-stone-100">{location.name}</span>
          <div className="ml-auto flex items-center gap-1 tabular-nums text-stone-500">
            <Users className="h-3 w-3" />
            <span className="text-[11px] font-medium">{location.users.length}</span>
          </div>
        </button>

        {/* Time axis */}
        <div className="relative flex-1 border-l border-white/5 bg-stone-950/40">
          {displayFilter.showHeaderTicks &&
            ticks.map((tick) => (
              <div
                key={tick.pct}
                className="absolute top-0 flex h-full flex-col items-center justify-end pb-2"
                style={{ left: `${tick.pct}%` }}
              >
                <div className="mb-0.5 h-2 w-px bg-stone-600" />
                <span className="translate-x-0.5 whitespace-nowrap font-mono text-[10px] font-medium tabular-nums text-stone-500">
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

"use client";

import { useState } from "react";
import { useScheduleTimeline } from "@/application/useSchedules";
import { ScheduleUserRow } from "./ScheduleUserRow";
import { getTimeTicks } from "./timelineUtils";

interface Props {
  dateInt: number;
  locationId?: string;
}

function dateIntToDate(n: number): Date {
  const s = String(n);
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
}

function LocationBlock({ location, dateInt }: { location: { location_id: string; name: string; timezone: string; users: any[] }; dateInt: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const rangeStart = dateIntToDate(dateInt);
  const rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);
  const ticks = getTimeTicks(rangeStart, rangeEnd, location.timezone);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
      <div className="flex h-9 bg-gray-800 text-white items-center">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-[220px] shrink-0 flex items-center gap-2 px-3 hover:bg-gray-700 h-full border-r border-gray-600"
        >
          <svg className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
          </svg>
          <span className="text-sm font-semibold truncate">{location.name}</span>
          <span className="ml-auto text-xs text-gray-400 font-normal">{location.users.length}명</span>
        </button>
        <div className="relative flex-1 h-full">
          {ticks.map((tick) => (
            <div key={tick.pct} className="absolute top-0 h-full flex flex-col items-center justify-center" style={{ left: `${tick.pct}%` }}>
              <div className="w-px h-2 bg-gray-500 mb-0.5" />
              <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap translate-x-1">{tick.label}</span>
            </div>
          ))}
        </div>
      </div>
      {!collapsed && location.users.map((user, idx) => (
        <ScheduleUserRow
          key={user.user_id}
          user={user}
          dateInt={dateInt}
          isLast={idx === location.users.length - 1}
        />
      ))}
      {!collapsed && location.users.length === 0 && (
        <div className="h-10 flex items-center justify-center text-sm text-gray-400">이 날짜에 스케줄 데이터가 없습니다</div>
      )}
    </div>
  );
}

export function ScheduleTimelineGrid({ dateInt, locationId }: Props) {
  const { data, isLoading, isError, error } = useScheduleTimeline(dateInt, locationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        스케줄 불러오는 중...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        오류: {error instanceof Error ? error.message : "데이터를 불러올 수 없습니다"}
      </div>
    );
  }

  if (!data || data.locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
        <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">이 날짜에 스케줄 데이터가 없습니다</p>
        <p className="text-xs text-gray-300">스케줄 파일을 업로드하거나 직접 입력하세요</p>
      </div>
    );
  }

  return (
    <div>
      {data.locations.map((loc) => (
        <LocationBlock key={loc.location_id} location={loc} dateInt={dateInt} />
      ))}
    </div>
  );
}

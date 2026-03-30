import { useState } from "react";
import type { TimelineLocation, TimelineFilter } from "@/domain/types";
import { UserRow } from "./UserRow";
import { getTimeTicks } from "./timelineUtils";

interface Props {
  location: TimelineLocation;
  rangeStart: Date;
  rangeEnd: Date;
  filter: TimelineFilter;
}

export function LocationGroup({ location, rangeStart, rangeEnd, filter }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const ticks = getTimeTicks(rangeStart, rangeEnd, location.timezone);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
      {/* Header */}
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

        {/* Tick marks */}
        <div className="relative flex-1 h-full">
          {ticks.map((tick) => (
            <div
              key={tick.pct}
              className="absolute top-0 h-full flex flex-col items-center justify-center"
              style={{ left: `${tick.pct}%` }}
            >
              <div className="w-px h-2 bg-gray-500 mb-0.5" />
              <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap translate-x-1">
                {tick.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* User rows */}
      {!collapsed &&
        location.users.map((user, idx) => (
          <UserRow
            key={user.user_id}
            user={user}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            timezone={location.timezone}
            isLast={idx === location.users.length - 1}
            filter={filter}
          />
        ))}

      {!collapsed && location.users.length === 0 && (
        <div className="h-10 flex items-center justify-center text-sm text-gray-400">
          이 기간에 기록이 없습니다
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Users } from "lucide-react";
import type { TimelineLocation, TimelineFilter } from "@/domain/types";
import type { Schedule } from "@/domain/scheduleTypes";
import { UserRow } from "./UserRow";
import { getTimeTicks } from "./timelineUtils";

interface Props {
  location: TimelineLocation;
  rangeStart: Date;
  rangeEnd: Date;
  filter: TimelineFilter;
  /** Map of userId → schedule entries. Pass empty object for non-single-day views. */
  scheduleByUser?: Record<string, Schedule[]>;
}

export function LocationGroup({ location, rangeStart, rangeEnd, filter, scheduleByUser = {} }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const ticks = getTimeTicks(rangeStart, rangeEnd, location.timezone);

  return (
    <div className="mb-3 rounded-md overflow-hidden border border-neutral-200 shadow-sm bg-white">
      {/* Header */}
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

        {/* Tick marks */}
        <div className="relative flex-1 h-full">
          {ticks.map((tick) => (
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
          <UserRow
            key={user.user_id}
            user={user}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            timezone={location.timezone}
            isLast={idx === location.users.length - 1}
            filter={filter}
            scheduleEntries={scheduleByUser[user.user_id] ?? []}
          />
        ))}

      {!collapsed && location.users.length === 0 && (
        <div className="h-10 flex items-center justify-center text-sm text-neutral-400">
          이 기간에 기록이 없습니다
        </div>
      )}
    </div>
  );
}

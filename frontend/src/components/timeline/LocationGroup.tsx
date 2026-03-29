import { useState } from "react";
import type { TimelineLocation } from "@/domain/types";
import { UserRow } from "./UserRow";

interface LocationGroupProps {
  location: TimelineLocation;
}

export function LocationGroup({ location }: LocationGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
      {/* Location header row */}
      <div className="flex h-9 bg-gray-800 text-white items-center">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-[220px] shrink-0 flex items-center gap-2 px-3 hover:bg-gray-700 h-full border-r border-gray-600"
        >
          <svg
            className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
          </svg>
          <span className="text-sm font-semibold truncate">{location.name}</span>
          <span className="ml-auto text-xs text-gray-400 font-normal">{location.users.length}명</span>
        </button>

        {/* Hour markers */}
        <div className="relative flex-1 h-full flex">
          {Array.from({ length: 24 }).map((_, h) => (
            <div
              key={h}
              className="flex-1 flex items-center justify-center border-r border-gray-600 text-xs text-gray-400 font-mono"
            >
              {String(h).padStart(2, "0")}
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
            timezone={location.timezone}
            isLast={idx === location.users.length - 1}
          />
        ))}

      {!collapsed && location.users.length === 0 && (
        <div className="h-10 flex items-center justify-center text-sm text-gray-400">
          이 날짜에 기록이 없습니다
        </div>
      )}
    </div>
  );
}

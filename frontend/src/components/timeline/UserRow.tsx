import type { TimelineUser } from "@/domain/types";
import { EventBar } from "./EventBar";

interface UserRowProps {
  user: TimelineUser;
  timezone: string;
  isLast: boolean;
}

export function UserRow({ user, timezone, isLast }: UserRowProps) {
  return (
    <div className={`flex h-12 ${isLast ? "" : "border-b border-gray-100"}`}>
      {/* User name label */}
      <div className="w-[220px] shrink-0 flex items-center px-3 border-r border-gray-200 bg-gray-50">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2 shrink-0">
          {user.user_name[0]?.toUpperCase()}
        </div>
        <span className="text-sm text-gray-700 truncate">{user.user_name}</span>
      </div>

      {/* 24-hour event track */}
      <div className="relative flex-1 bg-white">
        {/* Hour grid lines */}
        {Array.from({ length: 25 }).map((_, h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 border-l border-gray-100"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}

        {/* Event bars */}
        {user.events
          .filter((e) => !(e.category === "location" && e.event_type !== "home"))
          .map((event) => (
            <EventBar key={event.id} event={event} timezone={timezone} />
          ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import clsx from "clsx";
import type { LifeLogEvent } from "@/domain/types";
import { getEventStyle } from "./eventConfig";
import { positionEvent } from "./timelineUtils";
import { format } from "date-fns";

interface EventBarProps {
  event: LifeLogEvent;
  timezone: string;
}

export function EventBar({ event, timezone }: EventBarProps) {
  const [tooltip, setTooltip] = useState(false);
  const style = getEventStyle(event.category, event.event_type);
  const pos = positionEvent(event, timezone);

  const startTime = format(new Date(event.started_at), "HH:mm");
  const endTime = event.ended_at ? format(new Date(event.ended_at), "HH:mm") : null;
  const extraData = Object.entries(event.data)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  return (
    <div
      className="absolute top-1 bottom-1"
      style={{ left: `${pos.leftPct}%`, width: `${pos.widthPct}%` }}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      <div
        className={clsx(
          "h-full rounded px-1 flex items-center overflow-hidden cursor-pointer",
          "text-xs font-medium select-none transition-opacity hover:opacity-90",
          style.color,
          style.textColor,
          pos.isPoint && "rounded-full",
        )}
      >
        <span className="truncate">{style.label || event.event_type}</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute bottom-full left-0 z-50 mb-1 min-w-max rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl pointer-events-none">
          <div className="font-semibold">{style.label || event.event_type}</div>
          <div className="text-gray-300 mt-0.5">
            {startTime}{endTime ? ` → ${endTime}` : " (시점)"}
          </div>
          {extraData && <div className="text-gray-400 mt-0.5">{extraData}</div>}
          <div className="text-gray-500 mt-0.5 capitalize">{event.category}</div>
        </div>
      )}
    </div>
  );
}

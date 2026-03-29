"use client";

import { useState } from "react";
import type { LifeLogEvent } from "@/domain/types";
import { getEventStyle } from "./eventConfig";
import { positionEvent } from "./timelineUtils";
import { format } from "date-fns";

interface EventBarProps {
  event: LifeLogEvent;
  timezone: string;
}

export function EventBar({ event, timezone }: EventBarProps) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const style = getEventStyle(event.category, event.event_type);
  const pos = positionEvent(event, timezone);

  const startTime = format(new Date(event.started_at), "HH:mm");
  const endTime = event.ended_at ? format(new Date(event.ended_at), "HH:mm") : null;
  const extraData = Object.entries(event.data)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  const isLocation = event.category === "location";

  return (
    <>
      <div
        className="absolute cursor-pointer"
        style={
          isLocation
            ? {
                left: `${pos.leftPct}%`,
                width: `${Math.max(pos.widthPct, 0.5)}%`,
                bottom: 0,
                height: "8px",
              }
            : {
                left: `calc(${pos.leftPct}% - 5px)`,
                width: "10px",
                height: "10px",
                top: "50%",
                transform: "translateY(-50%)",
              }
        }
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltipPos(null)}
      >
        {isLocation ? (
          <div className={`w-full h-full rounded-sm opacity-80 hover:opacity-100 transition-opacity ${style.color}`} />
        ) : (
          <div className={`w-full h-full rounded-full opacity-85 hover:opacity-100 transition-opacity ring-1 ring-white/40 ${style.color}`} />
        )}
      </div>

      {/* Tooltip — fixed position so it's never clipped by overflow:hidden */}
      {tooltipPos && (
        <div
          className="fixed z-[9999] min-w-max rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl pointer-events-none"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 52 }}
        >
          <div className="font-semibold">{style.label || event.event_type}</div>
          <div className="text-gray-300 mt-0.5">
            {startTime}{endTime ? ` → ${endTime}` : " (시점)"}
          </div>
          {extraData && <div className="text-gray-400 mt-0.5">{extraData}</div>}
          <div className="text-gray-500 mt-0.5 capitalize">{event.category.replace("_", " ")}</div>
        </div>
      )}
    </>
  );
}

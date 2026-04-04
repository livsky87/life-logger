"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import type { ScheduleTimelineDisplayFilter, ScheduleTimelineUser } from "@/domain/scheduleTypes";
import { ScheduleUserTimelineChart } from "./ScheduleUserTimelineChart";

interface Props {
  user: ScheduleTimelineUser;
  dateInt: number;
  rangeStart: Date;
  rangeEnd: Date;
  days: number;
  displayFilter: ScheduleTimelineDisplayFilter;
  isLast: boolean;
}

/** Recharts 기반 행 높이 (밀도 스트립 포함 여유) */
const ROW_MIN_HEIGHT = 60;

export const ScheduleUserRow = React.memo(function ScheduleUserRow({
  user,
  dateInt,
  rangeStart,
  rangeEnd,
  days,
  displayFilter,
  isLast,
}: Props) {
  const router = useRouter();
  const dateStr = useMemo(() => String(dateInt), [dateInt]);

  return (
    <div
      className={`relative z-0 flex hover:z-[45] ${isLast ? "rounded-b-lg" : ""} ${isLast ? "" : "border-b border-stone-200/80"} bg-white`}
      style={{ minHeight: ROW_MIN_HEIGHT }}
    >
      <div className="flex w-[220px] shrink-0 items-center gap-2.5 border-r border-stone-200 bg-stone-50/90 px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 tabular-nums">
          {user.user_name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/schedule?userId=${user.user_id}&date=${dateStr}`}
            className="block truncate text-sm font-medium leading-tight text-stone-800 transition-colors hover:text-indigo-600"
          >
            {user.user_name}
          </Link>
          {user.user_job && (
            <div className="mt-0.5 truncate text-[11px] leading-tight text-stone-500">
              {user.user_job}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push(`/simulation?userId=${user.user_id}&date=${dateStr}`)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
          title="시뮬레이션 보기"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScheduleUserTimelineChart
        entries={user.entries}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        days={days}
        displayFilter={displayFilter}
      />
    </div>
  );
});

"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import type { ScheduleTimelineDisplayFilter, ScheduleTimelineUser } from "@/domain/scheduleTypes";
import { collectDistinctStatusTags } from "./scheduleTimelineChartUtils";
import { ScheduleUserTimelineChart } from "./ScheduleUserTimelineChart";

interface Props {
  user: ScheduleTimelineUser;
  dateInt: number;
  rangeStart: Date;
  rangeEnd: Date;
  days: number;
  displayFilter: ScheduleTimelineDisplayFilter;
  /** 집(위치) 타임존 — 축·툴팁·히트맵·밀도 스트립이 동일 기준 */
  timeZone: string;
  /** 위치당 첫 행만 시간 축 눈금(상태 차트와 동일 도메인) */
  showTimelineXAxis: boolean;
  isLast: boolean;
}

/** Recharts 기반 최소 행 높이 (범례·히트맵 여유) */
const ROW_MIN_HEIGHT = 56;

export const ScheduleUserRow = React.memo(function ScheduleUserRow({
  user,
  dateInt,
  rangeStart,
  rangeEnd,
  days,
  displayFilter,
  timeZone,
  showTimelineXAxis,
  isLast,
}: Props) {
  const router = useRouter();
  const dateStr = useMemo(() => String(dateInt), [dateInt]);

  const laneCount = useMemo(() => collectDistinctStatusTags(user.entries).length, [user.entries]);
  const rowMinHeight = useMemo(() => {
    const plot = laneCount === 0 ? 44 : 12 + laneCount * 26 + 24;
    const apiLegend = displayFilter.showApiCallMarkers ? 22 : 0;
    const heatmap = days === 1 && displayFilter.showActivityHeatmap ? 12 : 0;
    return Math.max(ROW_MIN_HEIGHT, plot + apiLegend + heatmap + 10);
  }, [laneCount, displayFilter.showApiCallMarkers, displayFilter.showActivityHeatmap, days]);

  return (
    <div
      className={`relative z-0 flex hover:z-[45] ${isLast ? "rounded-b-lg" : ""} ${isLast ? "" : "border-b border-zinc-200/80 dark:border-zinc-800/80"} bg-white dark:bg-zinc-950/50`}
      style={{ minHeight: rowMinHeight }}
    >
      <div className="flex w-[220px] shrink-0 items-center gap-2.5 border-r border-zinc-200 bg-zinc-50/90 px-3 dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-800 tabular-nums dark:bg-cyan-500/20 dark:text-cyan-200">
          {user.user_name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/schedule?userId=${user.user_id}&date=${dateStr}`}
            className="block truncate text-sm font-medium leading-tight text-zinc-800 transition-colors hover:text-cyan-600 dark:text-zinc-100 dark:hover:text-cyan-400"
          >
            {user.user_name}
          </Link>
          {user.user_job && (
            <div className="mt-0.5 truncate text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
              {user.user_job}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push(`/simulation?userId=${user.user_id}&date=${dateStr}`)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400"
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
        timeZone={timeZone}
        showXAxis={showTimelineXAxis}
      />
    </div>
  );
});

"use client";

import { useState } from "react";
import {
  defaultScheduleTimelineDisplayFilter,
  type ScheduleTimelineDisplayFilter,
} from "@/domain/scheduleTypes";

interface Props {
  filter: ScheduleTimelineDisplayFilter;
  onChange: (f: ScheduleTimelineDisplayFilter) => void;
}

type Row = { key: keyof ScheduleTimelineDisplayFilter; label: string };

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "축·격자",
    rows: [
      { key: "showHeaderTicks", label: "시간 축 눈금" },
      { key: "showGridLines", label: "세로 격자선" },
    ],
  },
  {
    title: "스케줄",
    rows: [
      { key: "showPresenceBars", label: "재실 구간 막대" },
      { key: "showEntryDots", label: "일정 시점(점)" },
      { key: "showStatusTags", label: "상태 뱃지" },
    ],
  },
  {
    title: "이벤트·보조선",
    rows: [
      { key: "showApiCallMarkers", label: "Device API 호출" },
      { key: "showPeriodicObservations", label: "주기 관측(HDE 밴드)" },
      { key: "showNowLine", label: "현재 시각 선" },
    ],
  },
  {
    title: "1일 보기 전용",
    rows: [{ key: "showActivityHeatmap", label: "활동 밀도 히트맵" }],
  },
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.rows.map((r) => r.key));

function allOn(): ScheduleTimelineDisplayFilter {
  return defaultScheduleTimelineDisplayFilter();
}

function allOff(): ScheduleTimelineDisplayFilter {
  return {
    showHeaderTicks: false,
    showGridLines: false,
    showPresenceBars: false,
    showEntryDots: false,
    showStatusTags: false,
    showApiCallMarkers: false,
    showNowLine: false,
    showActivityHeatmap: false,
    showPeriodicObservations: false,
  };
}

export function ScheduleTimelineFilterPanel({ filter, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const offCount = ALL_KEYS.filter((k) => !filter[k]).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
          offCount > 0
            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-900 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-200"
            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
        }`}
      >
        표시 필터
        {offCount > 0 && (
          <span className="flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-cyan-600 px-1 text-[10px] font-bold text-white dark:bg-cyan-500">
            {offCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] cursor-default bg-black/10 dark:bg-black/30"
            aria-label="필터 닫기"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-[90] mt-1 w-72 rounded-lg border border-zinc-200 bg-white py-3 px-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">타임라인 표시</span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="text-[11px] text-cyan-600 hover:underline dark:text-cyan-400"
                  onClick={() => onChange(allOn())}
                >
                  전부 켜기
                </button>
                <span className="text-zinc-300 dark:text-zinc-600">|</span>
                <button
                  type="button"
                  className="text-[11px] text-zinc-500 hover:underline dark:text-zinc-400"
                  onClick={() => onChange(allOff())}
                >
                  전부 끄기
                </button>
              </div>
            </div>
            <div className="max-h-[min(70vh,28rem)] space-y-3 overflow-y-auto pr-0.5">
              {SECTIONS.map(({ title, rows }) => (
                <div key={title}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    {title}
                  </p>
                  <ul className="space-y-2">
                    {rows.map(({ key, label }) => (
                      <li key={key}>
                        <label className="flex cursor-pointer select-none items-center gap-2">
                          <input
                            type="checkbox"
                            checked={filter[key]}
                            onChange={() => onChange({ ...filter, [key]: !filter[key] })}
                            className="h-3.5 w-3.5 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500 dark:border-zinc-600 dark:text-cyan-500"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

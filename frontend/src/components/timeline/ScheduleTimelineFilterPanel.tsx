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

const ROWS: { key: keyof ScheduleTimelineDisplayFilter; label: string }[] = [
  { key: "showHeaderTicks", label: "시간 축 눈금 (차트, 위치당 첫 행)" },
  { key: "showGridLines", label: "세로 격자선" },
  { key: "showPresenceBars", label: "재실/위치 구간 막대" },
  { key: "showEntryDots", label: "일정 시점(점)" },
  { key: "showStatusTags", label: "상태 뱃지" },
  { key: "showApiCallMarkers", label: "API 호출 표시" },
  { key: "showNowLine", label: "현재 시각 선" },
  { key: "showActivityHeatmap", label: "활동 밀도 (1일 보기)" },
];

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
  };
}

export function ScheduleTimelineFilterPanel({ filter, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const offCount = ROWS.filter((r) => !filter[r.key]).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
          offCount > 0
            ? "border-indigo-300 bg-indigo-50 text-indigo-800"
            : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
        }`}
      >
        표시 필터
        {offCount > 0 && (
          <span className="bg-indigo-600 text-white rounded-full min-w-[1.125rem] h-[1.125rem] px-1 text-[10px] font-bold flex items-center justify-center">
            {offCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="필터 닫기"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-neutral-200 bg-white py-3 px-3 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-semibold text-neutral-800">타임라인 표시</span>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  className="text-[11px] text-indigo-600 hover:underline"
                  onClick={() => onChange(allOn())}
                >
                  전부 켜기
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  type="button"
                  className="text-[11px] text-neutral-500 hover:underline"
                  onClick={() => onChange(allOff())}
                >
                  전부 끄기
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {ROWS.map(({ key, label }) => (
                <li key={key}>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filter[key]}
                      onChange={() => onChange({ ...filter, [key]: !filter[key] })}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-neutral-700">{label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { TimelineFilter } from "@/domain/types";

export type Period = "1d" | "1w" | "1m";

const CONTEXT_TYPES = [
  { value: "sleep",    label: "수면" },
  { value: "meal",     label: "식사" },
  { value: "cooking",  label: "요리" },
  { value: "shower",   label: "샤워" },
  { value: "work",     label: "업무" },
  { value: "exercise", label: "운동" },
  { value: "rest",     label: "휴식" },
  { value: "video",    label: "영상 시청" },
  { value: "music",    label: "음악 시청" },
  { value: "pet_walk", label: "펫 산책" },
];

const EVENT_TYPES = [
  { value: "fridge",          label: "냉장고" },
  { value: "microwave",       label: "전자레인지" },
  { value: "washing_machine", label: "세탁기" },
  { value: "door",            label: "현관문" },
  { value: "light",           label: "조명" },
  { value: "tv_on",           label: "TV 켬" },
  { value: "tv_off",          label: "TV 끔" },
  { value: "ac_on",           label: "에어컨 켬" },
  { value: "ac_off",          label: "에어컨 끔" },
];

/**
 * Period-aware default filter.
 *
 *  1d  — 하루치: 위치 + 활동 + 이벤트 모두 ON
 *  1w  — 한 주: 위치 + 활동 ON, 이벤트(순간 점) OFF  (7× 데이터)
 *  1m  — 한 달: 위치만 ON, 나머지 OFF               (30× 데이터)
 *
 * 프론트엔드는 활성화된 카테고리만 API에 요청하므로
 * 이 기본값 자체가 네트워크 부하를 직접 제어합니다.
 */
export function makeDefaultFilter(period: Period = "1d"): TimelineFilter {
  return {
    showLocation: true,
    showContext:  period !== "1m",   // 1d·1w: ON  /  1m: OFF
    contextTypes: new Set(),
    showEvent:    period === "1d",   // 1d: ON  /  1w·1m: OFF
    eventTypes:   new Set(),
    showApi:      false,             // 기본 숨김
  };
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

interface Props {
  filter: TimelineFilter;
  onChange: (f: TimelineFilter) => void;
  period: Period;
}

const PERIOD_WEIGHT: Record<Period, number> = { "1d": 1, "1w": 7, "1m": 30 };

/** 현재 filter + period 조합이 '무거운' 요청인지 추정 */
function isHeavy(filter: TimelineFilter, period: Period): boolean {
  const w = PERIOD_WEIGHT[period];
  return w >= 7 && (filter.showContext || filter.showEvent);
}

export function FilterPanel({ filter, onChange, period }: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    !filter.showLocation,
    !filter.showContext || filter.contextTypes.size > 0,
    !filter.showEvent   || filter.eventTypes.size   > 0,
    filter.showApi,
  ].filter(Boolean).length;

  const heavy = isHeavy(filter, period);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition ${
          activeCount > 0
            ? "bg-indigo-600 border-indigo-600 text-white"
            : "border-gray-200 text-gray-600 hover:bg-gray-100"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M10 12h4" />
        </svg>
        필터
        {activeCount > 0 && (
          <span className="bg-white text-indigo-600 rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
        {heavy && (
          <span className="ml-0.5 text-amber-300 text-[10px]" title="데이터가 많아 로딩이 느릴 수 있습니다">
            ⚠
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800">표시 필터</span>
            <button
              onClick={() => onChange(makeDefaultFilter(period))}
              className="text-xs text-indigo-600 hover:underline"
            >
              초기화
            </button>
          </div>

          {/* Period hint */}
          {period !== "1d" && (
            <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <span className="font-semibold">
                {period === "1w" ? "1주일" : "1달"} 조회 중
              </span>
              {" — "}
              {period === "1w"
                ? "활동·이벤트를 모두 켜면 데이터가 많아집니다. 필요한 항목만 선택하세요."
                : "장기 조회에서는 위치 기록만 보는 것을 권장합니다."}
            </div>
          )}

          {/* Location */}
          <Section
            label="📍 위치 (재실)"
            checked={filter.showLocation}
            onToggle={() => onChange({ ...filter, showLocation: !filter.showLocation })}
          />

          {/* Context */}
          <Section
            label="🌀 활동 (구간)"
            checked={filter.showContext}
            onToggle={() => onChange({ ...filter, showContext: !filter.showContext })}
            heavy={PERIOD_WEIGHT[period] >= 7}
          >
            {filter.showContext && (
              <ChipGroup
                items={CONTEXT_TYPES}
                selected={filter.contextTypes}
                onToggle={(v) => onChange({ ...filter, contextTypes: toggleSet(filter.contextTypes, v) })}
                emptyLabel="전체"
              />
            )}
          </Section>

          {/* Event */}
          <Section
            label="⚡ 이벤트 (순간)"
            checked={filter.showEvent}
            onToggle={() => onChange({ ...filter, showEvent: !filter.showEvent })}
            heavy={PERIOD_WEIGHT[period] >= 7}
          >
            {filter.showEvent && (
              <ChipGroup
                items={EVENT_TYPES}
                selected={filter.eventTypes}
                onToggle={(v) => onChange({ ...filter, eventTypes: toggleSet(filter.eventTypes, v) })}
                emptyLabel="전체"
              />
            )}
          </Section>

          {/* API */}
          <Section
            label="🔌 API 요청"
            checked={filter.showApi}
            onToggle={() => onChange({ ...filter, showApi: !filter.showApi })}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  label, checked, onToggle, heavy = false, children,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  heavy?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="flex items-center gap-2 cursor-pointer select-none mb-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
        />
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {heavy && !checked && (
          <span className="ml-auto text-[10px] text-amber-500 font-medium">많은 데이터</span>
        )}
      </label>
      {children}
    </div>
  );
}

function ChipGroup({
  items, selected, onToggle, emptyLabel,
}: {
  items: { value: string; label: string }[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  emptyLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1 pl-5 mt-1">
      {emptyLabel && selected.size === 0 && (
        <span className="px-2 py-0.5 rounded-full text-[11px] border border-indigo-300 bg-indigo-50 text-indigo-600">
          {emptyLabel}
        </span>
      )}
      {items.map((item) => {
        const active = selected.has(item.value);
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onToggle(item.value)}
            className={`px-2 py-0.5 rounded-full text-[11px] border transition ${
              active
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

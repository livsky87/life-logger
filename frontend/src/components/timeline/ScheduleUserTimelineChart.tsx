"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  CartesianGrid,
  ComposedChart,
  LabelList,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ApiObservation, ApiObservationOutcome } from "@/domain/apiObservationTypes";
import type { Schedule, ScheduleTimelineDisplayFilter } from "@/domain/scheduleTypes";
import {
  API_RESULT_BADGE,
  API_RESULT_LINE,
  SEGMENT_FILL,
  SEGMENT_STROKE,
  colorForStatusIdentity,
  formatStatusRunLabel,
  getChartColors,
  type SegmentType,
} from "./scheduleTimelineChartTheme";
import { useAppTheme } from "@/components/providers/ThemeProvider";
import type { ApiCallMarker } from "./scheduleTimelineChartUtils";
import {
  buildApiCallMarkers,
  buildHourBucketsForRange,
  buildMergedRuns,
  buildPerTagMergedRuns,
  collectDistinctStatusTags,
  HOUR_MS,
  laneTagToDisplayLabel,
  schedulePresenceIdentity,
  sortEntriesByTime,
  type MergedRun,
} from "./scheduleTimelineChartUtils";
import {
  formatTimeInTimeZone,
  formatTimelineDayInZone,
  formatTimelineShortDateInZone,
} from "./timelineUtils";

function shortUrl(url: string, max = 52): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
}

/** 호버 시각과 같은 묶음으로 볼 Device/HDE 이벤트(ms) */
const HOVER_EVENT_SNAP_MS = 1400;
/** “이 시각” 일정 행으로 볼 datetime 근접 허용(ms) */
const HOVER_INSTANT_ENTRY_MS = 2000;

const PRESENCE_KO: Record<SegmentType, string> = {
  home: "재실",
  away: "부재",
  transit: "이동",
  work: "사무·업무",
};

/** Recharts가 그리는 플롯 클립 사각형(축·마진 제외) — 내부 context/invert 없이 DOM만 사용 */
function readRechartsPlotRect(svg: SVGSVGElement | null): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (!svg) return null;
  const rect = svg.querySelector("defs clipPath rect");
  if (!rect) return null;
  const x = parseFloat(rect.getAttribute("x") || "NaN");
  const y = parseFloat(rect.getAttribute("y") || "NaN");
  const width = parseFloat(rect.getAttribute("width") || "NaN");
  const height = parseFloat(rect.getAttribute("height") || "NaN");
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return null;
  return {
    x,
    y: Number.isFinite(y) ? y : 0,
    width,
    height: Number.isFinite(height) ? height : 0,
  };
}

function clientPointToSvgUser(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const loc = pt.matrixTransform(ctm.inverse());
  return { x: loc.x, y: loc.y };
}

interface HoverSnapshot {
  tMs: number;
  presence: { run: MergedRun; labelKo: string } | null;
  lanes: Array<{ tag: string; run: MergedRun; entry: Schedule }>;
  contextEntry: Schedule | null;
  instantEntries: Schedule[];
  apiMarkers: ApiCallMarker[];
  periodicObservations: ApiObservation[];
}

function buildHoverSnapshot(
  tMs: number,
  ctx: {
    entries: Schedule[];
    presenceRuns: MergedRun[];
    runsByLane: Array<{ tag: string; laneIndex: number; runs: MergedRun[] }>;
    apiMarkers: ApiCallMarker[];
    periodicMarkers: Array<{ tMs: number; observation: ApiObservation }>;
  },
): HoverSnapshot {
  const { entries, presenceRuns, runsByLane, apiMarkers, periodicMarkers } = ctx;

  const presence =
    presenceRuns.find((r) => tMs >= r.tStart && tMs < r.tEnd) ?? null;
  const presenceBlock =
    presence != null
      ? {
          run: presence,
          labelKo:
            PRESENCE_KO[presence.identity as SegmentType] ?? presence.identity,
        }
      : null;

  const lanes: HoverSnapshot["lanes"] = [];
  for (const { tag, runs } of runsByLane) {
    const run = runs.find((r) => tMs >= r.tStart && tMs < r.tEnd);
    if (run) lanes.push({ tag, run, entry: run.entries[0] });
  }

  const sorted = sortEntriesByTime(entries);
  let contextEntry: Schedule | null = null;
  for (const e of sorted) {
    const et = new Date(e.datetime).getTime();
    if (et <= tMs) contextEntry = e;
    else break;
  }

  const instantEntries = sorted.filter((e) => {
    const et = new Date(e.datetime).getTime();
    return Math.abs(et - tMs) <= HOVER_INSTANT_ENTRY_MS;
  });

  const apiNear = apiMarkers
    .filter((m) => Math.abs(m.tMs - tMs) <= HOVER_EVENT_SNAP_MS)
    .sort((a, b) => Math.abs(a.tMs - tMs) - Math.abs(b.tMs - tMs));

  const periodicNear = periodicMarkers
    .filter((p) => Math.abs(p.tMs - tMs) <= HOVER_EVENT_SNAP_MS)
    .sort((a, b) => Math.abs(a.tMs - tMs) - Math.abs(b.tMs - tMs))
    .map((p) => p.observation);

  return {
    tMs,
    presence: presenceBlock,
    lanes,
    contextEntry,
    instantEntries,
    apiMarkers: apiNear,
    periodicObservations: periodicNear,
  };
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </div>
  );
}

function TimelineHoverCardBody({
  snapshot,
  timeZone,
}: {
  snapshot: HoverSnapshot;
  timeZone: string;
}) {
  const { theme } = useAppTheme();
  const cc = getChartColors(theme);

  return (
    <div
      className="max-h-[min(72vh,520px)] w-[min(100vw-24px,360px)] overflow-y-auto rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: cc.tooltipBg,
        borderColor: cc.tooltipBorder,
        color: "#e7e5e4",
      }}
    >
      <div className="mb-2 border-b border-white/10 pb-2">
        <div className="font-mono text-[11px] font-medium tabular-nums text-indigo-300">
          {formatTimeInTimeZone(snapshot.tMs, timeZone)}
        </div>
      </div>

      {snapshot.presence && (
        <div className="mb-2 border-b border-white/10 pb-2">
          <SectionTitle>재실</SectionTitle>
          <div className="text-[11px] text-stone-200">{snapshot.presence.labelKo}</div>
          <div className="mt-0.5 text-[10px] text-stone-400">
            {formatTimeInTimeZone(snapshot.presence.run.tStart, timeZone)} →{" "}
            {snapshot.presence.run.openEnded
              ? "…"
              : formatTimeInTimeZone(snapshot.presence.run.tEnd, timeZone)}
          </div>
        </div>
      )}

      {snapshot.contextEntry && (
        <div className="mb-2 border-b border-white/10 pb-2">
          <SectionTitle>당시 일정 문맥 (마지막 기록)</SectionTitle>
          <p className="text-[11px] leading-snug text-stone-200">
            {snapshot.contextEntry.description}
          </p>
          <div className="mt-1 text-[10px] text-stone-400">
            {snapshot.contextEntry.location}
            {snapshot.contextEntry.status?.length ? (
              <span className="ml-1">· {snapshot.contextEntry.status.join(", ")}</span>
            ) : null}
          </div>
        </div>
      )}

      {snapshot.instantEntries.length > 0 && (
        <div className="mb-2 border-b border-white/10 pb-2">
          <SectionTitle>이 시각 근처 일정 행</SectionTitle>
          <ul className="space-y-1.5">
            {snapshot.instantEntries.map((e) => (
              <li key={e.id} className="text-[10px] leading-snug">
                <span className="font-mono text-indigo-300/90">
                  {formatTimeInTimeZone(new Date(e.datetime).getTime(), timeZone)}
                </span>
                <div className="text-stone-200">{e.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {snapshot.lanes.length > 0 && (
        <div className="mb-2 border-b border-white/10 pb-2">
          <SectionTitle>상태 태그 (구간)</SectionTitle>
          <ul className="space-y-2">
            {snapshot.lanes.map(({ tag, run, entry }) => (
              <li key={`${tag}-${run.key}`} className="text-[10px] leading-snug">
                <div className="font-semibold text-amber-200/90">{laneTagToDisplayLabel(tag)}</div>
                <div className="font-mono text-[9px] text-stone-500">
                  {formatTimeInTimeZone(run.tStart, timeZone)} →{" "}
                  {run.openEnded ? "…" : formatTimeInTimeZone(run.tEnd, timeZone)}
                </div>
                {entry.location && (
                  <div className="truncate text-stone-400">{entry.location}</div>
                )}
                <p className="text-stone-200">{entry.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {snapshot.apiMarkers.length > 0 && (
        <div className="mb-2 border-b border-white/10 pb-2">
          <SectionTitle>Device 호출</SectionTitle>
          <ul className="space-y-2">
            {snapshot.apiMarkers.map((marker) => {
              const line = API_RESULT_LINE[marker.category];
              return (
                <li
                  key={marker.key}
                  className="rounded border border-white/5 bg-white/[0.03] px-2 py-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded px-1 py-px text-[9px] font-semibold"
                      style={{
                        backgroundColor: `${line.stroke}22`,
                        color: line.stroke,
                        border: `1px solid ${line.stroke}55`,
                      }}
                    >
                      {API_RESULT_BADGE[marker.category]}
                    </span>
                    <span className="font-mono text-[10px] text-indigo-300">
                      {formatTimeInTimeZone(marker.tMs, timeZone)}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-amber-200/90">
                    {marker.call.method}
                  </div>
                  <div className="break-all text-[10px] text-stone-400">
                    {shortUrl(marker.call.url, 52)}
                  </div>
                  {marker.call.deviceId && (
                    <div className="truncate text-[9px] text-stone-500">
                      Device: {marker.call.deviceId}
                    </div>
                  )}
                  <div className="mt-0.5 text-[10px] text-stone-300">
                    <span className="text-stone-500">result: </span>
                    {marker.call.result != null && marker.call.result !== "" ? (
                      marker.call.result
                    ) : (
                      <span className="italic text-stone-500">(비어 있음)</span>
                    )}
                  </div>
                  <div className="mt-1 border-t border-white/5 pt-1 text-[9px] text-stone-500">
                    일정: {marker.scheduleEntry.description.slice(0, 72)}
                    {marker.scheduleEntry.description.length > 72 ? "…" : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {snapshot.periodicObservations.length > 0 && (
        <div className="mb-1">
          <SectionTitle>HDE</SectionTitle>
          <ul className="space-y-2">
            {snapshot.periodicObservations.map((obs) => {
              const oc = obs.outcome as ApiObservationOutcome;
              const line = PERIODIC_OUTCOME_LINE[oc] ?? PERIODIC_OUTCOME_LINE.failure;
              const tObs = new Date(obs.observed_at).getTime();
              return (
                <li
                  key={obs.id}
                  className="rounded border border-white/5 bg-white/[0.03] px-2 py-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded px-1 py-px text-[9px] font-semibold"
                      style={{
                        backgroundColor: `${line.stroke}22`,
                        color: line.stroke,
                        border: `1px solid ${line.stroke}55`,
                      }}
                    >
                      {PERIODIC_BADGE[oc] ?? "HDE"}
                    </span>
                    <span className="font-mono text-[10px] text-indigo-300">
                      {formatTimeInTimeZone(tObs, timeZone)}
                    </span>
                    {obs.http_status != null && (
                      <span className="text-[9px] text-stone-400">HTTP {obs.http_status}</span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-teal-200/90">{obs.method}</div>
                  <div className="break-all text-[10px] text-stone-400">{obs.detail}</div>
                  {obs.description && (
                    <div className="mt-1 text-[9px] leading-snug text-stone-500">{obs.description}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!snapshot.presence &&
        !snapshot.contextEntry &&
        snapshot.instantEntries.length === 0 &&
        snapshot.lanes.length === 0 &&
        snapshot.apiMarkers.length === 0 &&
        snapshot.periodicObservations.length === 0 && (
          <p className="text-[10px] text-stone-500">
            이 시각에 표시할 추가 기록이 없습니다. (축 위를 따라 이동해 보세요)
          </p>
        )}
    </div>
  );
}

interface DotPayload {
  x: number;
  y: number;
  run: MergedRun;
  entry: Schedule;
  statusLabel: string | null;
  dotFill: string;
  timeZone: string;
}

interface ApiHitPayload {
  x: number;
  y: number;
  kind: "api";
  marker: ApiCallMarker;
  timeZone: string;
}

interface PeriodicObsPayload {
  x: number;
  y: number;
  kind: "periodic";
  observation: ApiObservation;
  timeZone: string;
}

const PERIODIC_OUTCOME_LINE: Record<
  ApiObservationOutcome,
  { stroke: string; strokeWidth: number }
> = {
  success: { stroke: "#0d9488", strokeWidth: 2 },
  warning: { stroke: "#d97706", strokeWidth: 2 },
  failure: { stroke: "#e11d48", strokeWidth: 2.25 },
};

const PERIODIC_BADGE: Record<ApiObservationOutcome, string> = {
  success: "HDE·성공",
  warning: "HDE·주의",
  failure: "HDE·실패",
};

function EntryDotShape(props: unknown) {
  const { cx = 0, cy = 0, payload } = props as {
    cx?: number;
    cy?: number;
    payload?: DotPayload;
  };
  if (!payload) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={payload.dotFill}
      stroke="#fff"
      strokeWidth={1.5}
    />
  );
}

/** 넓은 투명 히트 영역 — 세로선 위 호버용 */
function ApiHitShape(props: unknown) {
  const { cx = 0, cy = 0 } = props as { cx?: number; cy?: number };
  return (
    <rect
      x={(cx ?? 0) - 5}
      y={(cy ?? 0) - 14}
      width={10}
      height={28}
      fill="transparent"
      stroke="none"
    />
  );
}

function PeriodicObsHitShape(props: unknown) {
  const { cx = 0, cy = 0 } = props as { cx?: number; cy?: number };
  return (
    <rect
      x={(cx ?? 0) - 4}
      y={(cy ?? 0) - 12}
      width={8}
      height={24}
      fill="transparent"
      stroke="none"
    />
  );
}

interface Props {
  entries: Schedule[];
  rangeStart: Date;
  rangeEnd: Date;
  days: number;
  displayFilter: ScheduleTimelineDisplayFilter;
  timeZone: string;
  /** false면 X축 눈금 숨김(같은 위치의 아래 행). 도메인·격자·세로선은 동일 */
  showXAxis: boolean;
  /** Device(스케줄) 마커와 동일 차트·시간축에 그릴 HDE 수집(위치 공통+사용자별 병합본) */
  periodicObservations?: ApiObservation[];
}

const X_DOMAIN = (rangeStart: Date, rangeEnd: Date): [number, number] => [
  rangeStart.getTime(),
  rangeEnd.getTime(),
];

/** 재실(is_home) 구간 막대 — 상태 태그 행 바로 아래 */
const PRESENCE_STRIP = 0.52;
const PRESENCE_PAD = 0.06;
const LANE_INSET = 0.1;
/** 상태 영역 아래, 같은 X축 위에 그리는 Device / HDE 전용 밴드(도메인 단위 높이) */
const API_SCHEDULE_STRIP = 0.13;
const API_PERIODIC_STRIP = 0.13;
/** Device 밴드와 HDE 밴드 사이(도메인). 넓을수록 Y축 글자 간격이 벌어짐 */
const API_BAND_GAP = 0.07;

/**
 * 플롯 시작까지 왼쪽 여백(Recharts: offset.left = margin.left + 보이는 Y축 width).
 * margin.left 와 YAxis.width 를 동시에 크게 잡으면 합산되어 히트맵 paddingLeft(이 값)과 어긋남.
 */
const CHART_GUTTER = { left: 56, right: 10 } as const;

function apiLineStyle(marker: ApiCallMarker) {
  const base = API_RESULT_LINE[marker.category];
  const boost = Math.min(1.2, (marker.call.dsec ?? 0) / 25);
  return {
    stroke: base.stroke,
    strokeWidth: base.strokeWidth + boost,
  };
}

export function ScheduleUserTimelineChart({
  entries,
  rangeStart,
  rangeEnd,
  days,
  displayFilter,
  timeZone,
  showXAxis,
  periodicObservations = [],
}: Props) {
  const { theme: appTheme } = useAppTheme();
  const cc = getChartColors(appTheme);
  const t0 = rangeStart.getTime();
  const t1 = rangeEnd.getTime();
  const axisVisible = showXAxis && displayFilter.showHeaderTicks;

  const nowX = useMemo(() => {
    const nowMs = Date.now();
    if (nowMs < t0 || nowMs >= t1) return null;
    return nowMs;
  }, [t0, t1]);

  const laneTags = useMemo(() => collectDistinctStatusTags(entries), [entries]);

  const runsByLane = useMemo(() => {
    return laneTags.map((tag, laneIndex) => ({
      tag,
      laneIndex,
      runs: buildPerTagMergedRuns(entries, t1, tag),
    }));
  }, [entries, t1, laneTags]);

  const showSchedApiBand = displayFilter.showApiCallMarkers;
  const showPeriodicBand = displayFilter.showPeriodicObservations;

  const layout = useMemo(() => {
    const laneH = laneTags.length;
    const presTop = laneH + 0.02;
    const presBot = laneH + PRESENCE_STRIP;
    let y = presBot + PRESENCE_PAD;
    let schedTop = y;
    let schedBot = y;
    let perTop = y;
    let perBot = y;
    if (showSchedApiBand) {
      schedTop = y;
      schedBot = y + API_SCHEDULE_STRIP;
      y = schedBot + API_BAND_GAP;
    }
    if (showPeriodicBand) {
      perTop = y;
      perBot = y + API_PERIODIC_STRIP;
      y = perBot;
    }
    const yMax = y + 0.06;
    const schedMid = showSchedApiBand ? (schedTop + schedBot) / 2 : null;
    const perMid = showPeriodicBand ? (perTop + perBot) / 2 : null;
    /** Y축 글자는 밴드 중앙이 아니라 위·아래 쪽에 두어 Device/HDE 라벨이 겹치지 않게 함 */
    const schedLabelY =
      showSchedApiBand ? schedTop + API_SCHEDULE_STRIP * 0.22 : null;
    const perLabelY =
      showPeriodicBand ? perBot - API_PERIODIC_STRIP * 0.22 : null;
    return {
      laneH,
      presTop,
      presBot,
      schedTop,
      schedBot,
      perTop,
      perBot,
      yMax,
      schedMid,
      perMid,
      schedLabelY,
      perLabelY,
      presenceY: { y1: presTop, y2: presBot },
    };
  }, [laneTags.length, showSchedApiBand, showPeriodicBand]);

  const yDomainMax = layout.yMax;
  const presenceY = layout.presenceY;

  const presenceRuns = useMemo(
    () => buildMergedRuns(entries, t1, schedulePresenceIdentity),
    [entries, t1],
  );

  const apiMarkers = useMemo(() => {
    return buildApiCallMarkers(entries).filter((m) => m.tMs >= t0 && m.tMs < t1);
  }, [entries, t0, t1]);

  const apiScheduleHitY = layout.schedMid ?? 0;

  const apiHitData = useMemo((): ApiHitPayload[] => {
    if (!displayFilter.showApiCallMarkers || layout.schedMid == null) return [];
    return apiMarkers.map((marker) => ({
      x: marker.tMs,
      y: apiScheduleHitY,
      kind: "api" as const,
      marker,
      timeZone,
    }));
  }, [apiMarkers, displayFilter.showApiCallMarkers, apiScheduleHitY, layout.schedMid, timeZone]);

  const periodicMarkers = useMemo(() => {
    if (!displayFilter.showPeriodicObservations || periodicObservations.length === 0) return [];
    const out: { key: string; tMs: number; observation: ApiObservation }[] = [];
    for (const obs of periodicObservations) {
      const tMs = new Date(obs.observed_at).getTime();
      if (tMs >= t0 && tMs < t1) {
        out.push({ key: `p-${obs.id}-${tMs}`, tMs, observation: obs });
      }
    }
    return out.sort((a, b) => a.tMs - b.tMs);
  }, [displayFilter.showPeriodicObservations, periodicObservations, t0, t1]);

  const periodicHitY = layout.perMid ?? 0;

  const periodicHitData = useMemo((): PeriodicObsPayload[] => {
    if (!displayFilter.showPeriodicObservations || layout.perMid == null) return [];
    return periodicMarkers.map(({ tMs, observation }) => ({
      x: tMs,
      y: periodicHitY,
      kind: "periodic" as const,
      observation,
      timeZone,
    }));
  }, [periodicMarkers, displayFilter.showPeriodicObservations, periodicHitY, layout.perMid, timeZone]);

  const periodicOutcomeCounts = useMemo(() => {
    const m: Record<ApiObservationOutcome, number> = { success: 0, warning: 0, failure: 0 };
    for (const { observation } of periodicMarkers) {
      const k = observation.outcome as ApiObservationOutcome;
      if (k in m) m[k] += 1;
    }
    return m;
  }, [periodicMarkers]);

  const scatterData = useMemo((): DotPayload[] => {
    if (!displayFilter.showEntryDots || laneTags.length === 0) return [];
    const out: DotPayload[] = [];
    for (const { laneIndex, runs } of runsByLane) {
      const y = laneIndex + 0.5;
      for (const run of runs) {
        if (!run.openEnded) continue;
        const colors = colorForStatusIdentity(run.identity);
        out.push({
          x: run.tStart,
          y,
          run,
          entry: run.entries[0],
          statusLabel: displayFilter.showStatusTags ? formatStatusRunLabel(run.identity) : null,
          dotFill: colors.dot,
          timeZone,
        });
      }
    }
    return out;
  }, [displayFilter.showEntryDots, displayFilter.showStatusTags, runsByLane, laneTags.length, timeZone]);

  const hourBuckets = useMemo(
    () => buildHourBucketsForRange(entries, t0, t1),
    [entries, t0, t1],
  );
  const heatmapMax = useMemo(() => Math.max(1, ...hourBuckets), [hourBuckets]);

  const xTicks = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    if (days <= 1) {
      const hourMs = 60 * 60 * 1000;
      const ticks: number[] = [];
      for (let h = 0; h <= 24; h += 2) {
        const x = t0 + h * hourMs;
        if (x <= t1) ticks.push(x);
      }
      return ticks;
    }
    if (days <= 8) {
      const ticks: number[] = [];
      let x = t0;
      while (x < t1) {
        ticks.push(x);
        x += dayMs;
      }
      return ticks;
    }
    const stepDays = days <= 14 ? 2 : 5;
    const ticks: number[] = [];
    let x = t0;
    while (x < t1) {
      ticks.push(x);
      x += stepDays * dayMs;
    }
    return ticks;
  }, [t0, t1, days]);

  const tickFormatter = useCallback(
    (ts: number) => {
      if (days <= 1) return formatTimeInTimeZone(ts, timeZone);
      if (days <= 8) return formatTimelineDayInZone(ts, timeZone);
      return formatTimelineShortDateInZone(ts, timeZone);
    },
    [days, timeZone],
  );

  const domain = X_DOMAIN(rangeStart, rangeEnd);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of apiMarkers) {
      const k = x.category;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [apiMarkers]);

  const laneYTicks = useMemo(
    () => laneTags.map((_, k) => k + 0.5),
    [laneTags],
  );

  const yAxisTicks = useMemo(() => {
    const ticks = [...laneYTicks];
    if (layout.schedLabelY != null) ticks.push(layout.schedLabelY);
    if (layout.perLabelY != null) ticks.push(layout.perLabelY);
    return ticks.sort((a, b) => a - b);
  }, [laneYTicks, layout.schedLabelY, layout.perLabelY]);

  const yAxisTickFormatter = useCallback(
    (v: number) => {
      if (layout.schedLabelY != null && Math.abs(v - layout.schedLabelY) < 0.03) return "Device";
      if (layout.perLabelY != null && Math.abs(v - layout.perLabelY) < 0.03) return "HDE";
      const k = Math.round(Number(v) - 0.5);
      const tag = laneTags[k];
      return tag != null ? laneTagToDisplayLabel(tag) : "";
    },
    [laneTags, layout.schedLabelY, layout.perLabelY],
  );

  const chartPlotHeightPx = useMemo(() => {
    const presencePx = 36;
    const lanePx = laneTags.length === 0 ? 28 : 12 + laneTags.length * 26;
    let h = lanePx + presencePx;
    if (showSchedApiBand) h += 18;
    if (showPeriodicBand) h += 18;
    return Math.min(420, Math.max(96, h));
  }, [laneTags.length, showSchedApiBand, showPeriodicBand]);

  const chartMarginBottom = axisVisible
    ? displayFilter.showStatusTags
      ? 16
      : 6
    : displayFilter.showStatusTags
      ? 12
      : 3;

  const plotAlignPad = useMemo(
    () => ({ paddingLeft: CHART_GUTTER.left, paddingRight: CHART_GUTTER.right }),
    [],
  );

  const showYAxis =
    laneTags.length > 0 || layout.schedLabelY != null || layout.perLabelY != null;
  /** Y축(상태 태그 + Device/HDE 밴드 라벨): width 56. 없으면 gutter만 */
  const chartMarginLeft = showYAxis ? 0 : CHART_GUTTER.left;

  const [pointerHover, setPointerHover] = useState<{
    tMs: number;
    cx: number;
    cy: number;
  } | null>(null);

  const hoverSnapshot = useMemo(() => {
    if (pointerHover == null) return null;
    return buildHoverSnapshot(pointerHover.tMs, {
      entries,
      presenceRuns,
      runsByLane,
      apiMarkers,
      periodicMarkers,
    });
  }, [pointerHover, entries, presenceRuns, runsByLane, apiMarkers, periodicMarkers]);

  const hoverTooltipPos = useMemo(() => {
    if (pointerHover == null) return null;
    const margin = 10;
    const gap = 14;
    const estW = 340;
    const estH = 280;
    let left = pointerHover.cx + gap;
    if (left + estW > window.innerWidth - margin) {
      left = pointerHover.cx - gap - estW;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - estW));
    let top = pointerHover.cy - 28;
    top = Math.max(margin, Math.min(top, window.innerHeight - margin - estH));
    return { left, top };
  }, [pointerHover]);

  const chartPlotHostRef = useRef<HTMLDivElement>(null);

  /** clipPath 플롯 + SVG CTM 선형 보간 — scale.invert·Y축 hit 불일치에 의존하지 않음 */
  const updatePointerHoverFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const host = chartPlotHostRef.current;
      const surface = host?.querySelector<SVGSVGElement>("svg.recharts-surface");
      if (!surface) {
        setPointerHover(null);
        return;
      }
      const svgPt = clientPointToSvgUser(surface, clientX, clientY);
      if (!svgPt) {
        setPointerHover(null);
        return;
      }
      const clip = readRechartsPlotRect(surface);
      let plotX: number;
      let plotW: number;
      if (clip && clip.width > 0) {
        plotX = clip.x;
        plotW = clip.width;
      } else {
        const vbw = surface.viewBox?.baseVal?.width ?? surface.clientWidth;
        const pl = CHART_GUTTER.left;
        const pr = CHART_GUTTER.right;
        plotX = pl;
        plotW = Math.max(1, vbw - pl - pr);
      }
      if (svgPt.x < plotX || svgPt.x > plotX + plotW) {
        setPointerHover(null);
        return;
      }
      const frac = (svgPt.x - plotX) / plotW;
      const tMs = t0 + frac * (t1 - t0);
      if (!Number.isFinite(tMs) || tMs < t0 || tMs >= t1) {
        setPointerHover(null);
        return;
      }
      setPointerHover({ tMs, cx: clientX, cy: clientY });
    },
    [t0, t1],
  );

  const handlePlotOverlayMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      updatePointerHoverFromEvent(e.clientX, e.clientY);
    },
    [updatePointerHoverFromEvent],
  );

  const handlePlotOverlayMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      updatePointerHoverFromEvent(e.clientX, e.clientY);
    },
    [updatePointerHoverFromEvent],
  );

  const handlePlotOverlayLeave = useCallback(() => {
    setPointerHover(null);
  }, []);

  return (
    <div className="flex min-h-[60px] min-w-0 flex-1 flex-col justify-center gap-1 overflow-visible">
        <div
          ref={chartPlotHostRef}
          className="relative z-0 w-full min-w-0 overflow-visible"
          style={{ height: chartPlotHeightPx }}
        >
          <ResponsiveContainer width="100%" height="100%" className="!overflow-visible [&_.recharts-wrapper]:!overflow-visible">
            <ComposedChart
              data={[]}
              margin={{
                top: 6,
                right: CHART_GUTTER.right,
                bottom: chartMarginBottom,
                left: chartMarginLeft,
              }}
              barCategoryGap={0}
            >
            <XAxis
              type="number"
              dataKey="x"
              domain={domain}
              scale="time"
              ticks={xTicks}
              tickFormatter={tickFormatter}
              hide={!axisVisible}
              tick={{
                fill: cc.axis,
                fontSize: 10,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
              tickLine={{ stroke: cc.gridStrong }}
              axisLine={{ stroke: cc.gridStrong }}
            />
            <YAxis
              type="number"
              domain={[0, yDomainMax]}
              ticks={yAxisTicks}
              hide={!showYAxis}
              tickFormatter={yAxisTickFormatter}
              tick={{ fill: cc.axis, fontSize: 9 }}
              tickMargin={8}
              width={CHART_GUTTER.left}
              interval={0}
            />
            {displayFilter.showGridLines && (
              <CartesianGrid
                strokeDasharray="4 4"
                stroke={cc.grid}
                vertical
                horizontal={false}
              />
            )}
            {laneTags.length > 1 &&
              displayFilter.showGridLines &&
              Array.from({ length: laneTags.length - 1 }, (_, i) => i + 1).map((yk) => (
                <ReferenceLine
                  key={`lane-h-${yk}`}
                  y={yk}
                  stroke={cc.grid}
                  strokeDasharray="2 6"
                  strokeOpacity={0.85}
                  isFront={false}
                />
              ))}
            {showSchedApiBand && (
              <ReferenceArea
                x1={t0}
                x2={t1}
                y1={layout.schedTop}
                y2={layout.schedBot}
                fill={cc.grid}
                fillOpacity={0.07}
                stroke="none"
                isAnimationActive={false}
              />
            )}
            {showPeriodicBand && (
              <ReferenceArea
                x1={t0}
                x2={t1}
                y1={layout.perTop}
                y2={layout.perBot}
                fill={cc.grid}
                fillOpacity={0.05}
                stroke="none"
                isAnimationActive={false}
              />
            )}
            {displayFilter.showPresenceBars &&
              presenceRuns.map((run) => {
                const seg = run.identity as SegmentType;
                return (
                  <ReferenceArea
                    key={`pr-${run.key}`}
                    x1={run.tStart}
                    x2={run.tEnd}
                    y1={presenceY.y1}
                    y2={presenceY.y2}
                    fill={SEGMENT_FILL[seg]}
                    stroke={SEGMENT_STROKE[seg]}
                    strokeWidth={0.5}
                    fillOpacity={1}
                    isAnimationActive={false}
                  />
                );
              })}
            {runsByLane.flatMap(({ laneIndex, runs }) =>
              runs
                .filter((run) => !run.openEnded)
                .map((run) => {
                  const c = colorForStatusIdentity(run.identity);
                  const y1 = laneIndex + LANE_INSET;
                  const y2 = laneIndex + 1 - LANE_INSET;
                  return (
                    <ReferenceArea
                      key={`sr-${run.key}`}
                      x1={run.tStart}
                      x2={run.tEnd}
                      y1={y1}
                      y2={y2}
                      fill={c.fill}
                      stroke={c.stroke}
                      strokeWidth={0.6}
                      fillOpacity={1}
                      isAnimationActive={false}
                    />
                  );
                }),
            )}
            {displayFilter.showApiCallMarkers &&
              layout.schedMid != null &&
              apiMarkers.map((marker) => {
                const ls = apiLineStyle(marker);
                return (
                  <ReferenceLine
                    key={marker.key}
                    segment={[
                      { x: marker.tMs, y: layout.schedTop },
                      { x: marker.tMs, y: layout.schedBot },
                    ]}
                    stroke={ls.stroke}
                    strokeWidth={ls.strokeWidth}
                    isFront={false}
                  />
                );
              })}
            {displayFilter.showPeriodicObservations &&
              layout.perMid != null &&
              periodicMarkers.map(({ key, tMs, observation }) => {
                const oc = observation.outcome as ApiObservationOutcome;
                const ls = PERIODIC_OUTCOME_LINE[oc] ?? PERIODIC_OUTCOME_LINE.failure;
                return (
                  <ReferenceLine
                    key={key}
                    segment={[
                      { x: tMs, y: layout.perTop },
                      { x: tMs, y: layout.perBot },
                    ]}
                    stroke={ls.stroke}
                    strokeWidth={ls.strokeWidth}
                    strokeOpacity={0.92}
                    isFront={false}
                  />
                );
              })}
            {displayFilter.showNowLine && nowX != null && (
              <ReferenceLine
                x={nowX}
                stroke={cc.now}
                strokeWidth={1}
                strokeDasharray="3 3"
                isFront
              />
            )}
            {pointerHover != null && (
              <ReferenceLine
                x={pointerHover.tMs}
                stroke={cc.gridStrong}
                strokeWidth={1}
                strokeOpacity={0.55}
                strokeDasharray="3 3"
                isFront
              />
            )}
            <Tooltip
              cursor={false}
              content={() => null}
              wrapperStyle={{ display: "none", visibility: "hidden" }}
              isAnimationActive={false}
              shared={false}
            />
            <Scatter
              name="api-hit"
              data={apiHitData}
              dataKey="y"
              fill="transparent"
              isAnimationActive={false}
              shape={ApiHitShape}
            />
            <Scatter
              name="periodic-obs"
              data={periodicHitData}
              dataKey="y"
              fill="transparent"
              isAnimationActive={false}
              shape={PeriodicObsHitShape}
            />
            <Scatter
              data={scatterData}
              dataKey="y"
              fill="#4f46e5"
              isAnimationActive={false}
              shape={EntryDotShape}
            >
              {displayFilter.showStatusTags && (
                <LabelList
                  dataKey="statusLabel"
                  content={(raw: unknown) => {
                    const p = raw as {
                      x?: number;
                      y?: number;
                      value?: string | number | null;
                    };
                    const v = p.value;
                    if (v == null || v === "" || p.x == null || p.y == null) return null;
                    return (
                      <text
                        x={p.x + 6}
                        y={p.y + 18}
                        fontSize={9}
                        fontWeight={600}
                        fill={cc.statusTagFill}
                        className="tabular-nums"
                      >
                        {String(v)}
                      </text>
                    );
                  }}
                />
              )}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
          {/* SVG보다 위에서 포인터 수신 (item 툴팁·inRange와 무관) */}
          <div
            className="absolute inset-0 z-[5] cursor-crosshair touch-none"
            style={{ pointerEvents: "auto" }}
            onPointerMove={handlePlotOverlayMove}
            onPointerLeave={handlePlotOverlayLeave}
            onPointerCancel={handlePlotOverlayLeave}
            onMouseMove={handlePlotOverlayMouseMove}
            onMouseLeave={handlePlotOverlayLeave}
            aria-hidden
          />
      </div>

      {displayFilter.showApiCallMarkers && apiMarkers.length > 0 && (
        <div
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-zinc-500 dark:text-zinc-400"
          style={plotAlignPad}
        >
          <span className="font-medium text-zinc-600 dark:text-zinc-300">Device</span>
          {(Object.keys(API_RESULT_LINE) as Array<keyof typeof API_RESULT_LINE>).map((cat) => {
            const n = categoryCounts.get(cat) ?? 0;
            if (n === 0) return null;
            const ls = API_RESULT_LINE[cat];
            return (
              <span key={cat} className="inline-flex items-center gap-1 tabular-nums">
                <svg width={6} height={14} className="shrink-0" aria-hidden>
                  <line
                    x1={3}
                    y1={1}
                    x2={3}
                    y2={13}
                    stroke={ls.stroke}
                    strokeWidth={ls.strokeWidth}
                  />
                </svg>
                {API_RESULT_BADGE[cat]}{" "}
                <span className="text-zinc-400 dark:text-zinc-500">×{n}</span>
              </span>
            );
          })}
        </div>
      )}

      {displayFilter.showPeriodicObservations && periodicMarkers.length > 0 && (
        <div
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-zinc-500 dark:text-zinc-400"
          style={plotAlignPad}
        >
          <span className="font-medium text-zinc-600 dark:text-zinc-300">HDE</span>
          {(Object.keys(PERIODIC_OUTCOME_LINE) as ApiObservationOutcome[]).map((oc) => {
            const n = periodicOutcomeCounts[oc];
            if (!n) return null;
            const ls = PERIODIC_OUTCOME_LINE[oc];
            return (
              <span key={oc} className="inline-flex items-center gap-1 tabular-nums">
                <svg width={6} height={14} className="shrink-0" aria-hidden>
                  <line
                    x1={3}
                    y1={1}
                    x2={3}
                    y2={13}
                    stroke={ls.stroke}
                    strokeWidth={ls.strokeWidth}
                  />
                </svg>
                {PERIODIC_BADGE[oc]}{" "}
                <span className="text-zinc-400 dark:text-zinc-500">×{n}</span>
              </span>
            );
          })}
        </div>
      )}

      {days === 1 && displayFilter.showActivityHeatmap && hourBuckets.length > 0 && (
        <div className="h-[7px] w-full min-w-0" style={plotAlignPad}>
          <div
            className="flex h-full min-w-0 gap-px"
            role="img"
            aria-label="시간대별 활동 밀도(차트와 동일 시간축)"
          >
            {hourBuckets.map((count, i) => {
              const tSlot = t0 + i * HOUR_MS;
              const fill =
                count === 0
                  ? "transparent"
                  : `rgba(79, 70, 229, ${0.12 + (count / heatmapMax) * 0.55})`;
              return (
                <div
                  key={i}
                  className="min-h-0 min-w-0 flex-1 rounded-[1px]"
                  style={{ backgroundColor: fill, flex: "1 1 0" }}
                  title={`${formatTimeInTimeZone(tSlot, timeZone)} · ${count}건`}
                />
              );
            })}
          </div>
        </div>
      )}

      {typeof document !== "undefined" &&
        pointerHover != null &&
        hoverSnapshot != null &&
        hoverTooltipPos != null &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[200]"
            style={{ left: hoverTooltipPos.left, top: hoverTooltipPos.top }}
          >
            <TimelineHoverCardBody snapshot={hoverSnapshot} timeZone={timeZone} />
          </div>,
          document.body,
        )}
      </div>
  );
}

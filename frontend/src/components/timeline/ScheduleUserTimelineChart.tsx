"use client";

import { useCallback, useMemo } from "react";
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
import { Zap } from "lucide-react";
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

function StateRunTooltip({ payload }: { payload: DotPayload }) {
  const { theme } = useAppTheme();
  const cc = getChartColors(theme);
  const { run, entry } = payload;
  const first = run.entries[0];
  const last = run.entries[run.entries.length - 1];
  const sameInstant = first.datetime === last.datetime;
  const anyCalls = run.entries.reduce((n, e) => n + e.calls.length, 0);

  return (
    <div
      className="max-w-[280px] rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: cc.tooltipBg,
        borderColor: cc.tooltipBorder,
        color: "#e7e5e4",
      }}
    >
      <div className="mb-1.5 border-b border-white/10 pb-1.5">
        <div className="text-[11px] font-semibold text-stone-100">
          {formatStatusRunLabel(run.identity)}
        </div>
        <div className="mt-0.5 font-mono text-[10px] font-medium tabular-nums text-indigo-300">
          {sameInstant
            ? formatTimeInTimeZone(new Date(first.datetime).getTime(), payload.timeZone)
            : `${formatTimeInTimeZone(new Date(first.datetime).getTime(), payload.timeZone)} → ${formatTimeInTimeZone(new Date(last.datetime).getTime(), payload.timeZone)}`}
        </div>
        {run.entries.length > 1 && (
          <div className="mt-1 text-[10px] text-stone-400">
            이 태그 행에서 연속 기록 {run.entries.length}건
          </div>
        )}
      </div>
      {entry.location && (
        <div className="mb-1 truncate text-[10px] text-stone-400">{entry.location}</div>
      )}
      <p className="text-[11px] leading-snug text-stone-200">{entry.description}</p>
      {anyCalls > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-amber-400/90 text-[10px]">
          <Zap className="h-3 w-3 shrink-0" />
          <span>구간 내 API 호출 {anyCalls}건 (세로선 참고)</span>
        </div>
      )}
    </div>
  );
}

function ApiCallTooltip({ marker, timeZone }: { marker: ApiCallMarker; timeZone: string }) {
  const { theme } = useAppTheme();
  const cc = getChartColors(theme);
  const { call, scheduleEntry, category } = marker;
  const line = API_RESULT_LINE[category];
  return (
    <div
      className="max-w-[300px] rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: cc.tooltipBg,
        borderColor: cc.tooltipBorder,
        color: "#e7e5e4",
      }}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2 border-b border-white/10 pb-1.5">
        <span
          className="rounded px-1.5 py-px text-[10px] font-semibold"
          style={{
            backgroundColor: `${line.stroke}22`,
            color: line.stroke,
            border: `1px solid ${line.stroke}55`,
          }}
        >
          {API_RESULT_BADGE[category]}
        </span>
        <span className="font-mono text-[10px] font-medium text-indigo-300 tabular-nums">
          {formatTimeInTimeZone(marker.tMs, timeZone)}
        </span>
        <span className="text-[10px] text-stone-500">dsec {call.dsec}</span>
      </div>
      <div className="mb-1 font-mono text-[10px] text-amber-200/90">{call.method}</div>
      <div className="mb-1.5 break-all text-[10px] leading-snug text-stone-400">
        {shortUrl(call.url, 56)}
      </div>
      {call.deviceId && (
        <div className="mb-1 truncate text-[9px] text-stone-500">device: {call.deviceId}</div>
      )}
      <div className="mb-1.5 text-[10px] text-stone-300">
        <span className="text-stone-500">result: </span>
        {call.result != null && call.result !== "" ? (
          <span className="text-stone-200">{call.result}</span>
        ) : (
          <span className="italic text-stone-500">(비어 있음)</span>
        )}
      </div>
      <div className="border-t border-white/10 pt-1.5 text-[10px] text-stone-500">
        스케줄: {scheduleEntry.description.slice(0, 80)}
        {scheduleEntry.description.length > 80 ? "…" : ""}
      </div>
    </div>
  );
}

function TimelineTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  if (!active || !payload?.length) return null;
  const raw = payload[0].payload;
  if (raw && typeof raw === "object" && (raw as ApiHitPayload).kind === "api") {
    const p = raw as ApiHitPayload;
    return <ApiCallTooltip marker={p.marker} timeZone={p.timeZone} />;
  }
  if (raw && typeof raw === "object" && "run" in raw && "entry" in raw) {
    return <StateRunTooltip payload={raw as DotPayload} />;
  }
  return null;
}

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

interface Props {
  entries: Schedule[];
  rangeStart: Date;
  rangeEnd: Date;
  days: number;
  displayFilter: ScheduleTimelineDisplayFilter;
  timeZone: string;
  /** false면 X축 눈금 숨김(같은 위치의 아래 행). 도메인·격자·세로선은 동일 */
  showXAxis: boolean;
}

const X_DOMAIN = (rangeStart: Date, rangeEnd: Date): [number, number] => [
  rangeStart.getTime(),
  rangeEnd.getTime(),
];

/** 집·밖(is_home) 구간 막대 — 도메인 단위, 차트 최상단(상태 태그 행 위) */
const PRESENCE_STRIP = 0.52;
const PRESENCE_PAD = 0.06;
const LANE_INSET = 0.1;

/**
 * 플롯 시작까지 왼쪽 여백(Recharts: offset.left = margin.left + 보이는 Y축 width).
 * margin.left 와 YAxis.width 를 동시에 크게 잡으면 합산되어 히트맵 paddingLeft(이 값)과 어긋남.
 */
const CHART_GUTTER = { left: 56, right: 10 } as const;

function apiLineStyle(marker: ApiCallMarker) {
  const base = API_RESULT_LINE[marker.category];
  const boost = Math.min(1.2, (marker.call.dsec ?? 0) / 25);
  return {
    ...base,
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

  const yDomainMax = useMemo(() => {
    const base = laneTags.length;
    return base + PRESENCE_STRIP + PRESENCE_PAD;
  }, [laneTags.length]);

  const presenceY = useMemo(() => {
    const y0 = laneTags.length;
    return { y1: y0 + 0.02, y2: y0 + PRESENCE_STRIP };
  }, [laneTags.length]);

  const presenceRuns = useMemo(
    () => buildMergedRuns(entries, t1, schedulePresenceIdentity),
    [entries, t1],
  );

  const apiMarkers = useMemo(() => {
    return buildApiCallMarkers(entries).filter((m) => m.tMs >= t0 && m.tMs < t1);
  }, [entries, t0, t1]);

  const apiHitY = laneTags.length > 0 ? laneTags.length / 2 : 0.14;

  const apiHitData = useMemo((): ApiHitPayload[] => {
    if (!displayFilter.showApiCallMarkers) return [];
    return apiMarkers.map((marker) => ({
      x: marker.tMs,
      y: apiHitY,
      kind: "api" as const,
      marker,
      timeZone,
    }));
  }, [apiMarkers, displayFilter.showApiCallMarkers, apiHitY, timeZone]);

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

  const chartPlotHeightPx = useMemo(() => {
    const presencePx = 36;
    if (laneTags.length === 0) return Math.min(120, 28 + presencePx);
    return Math.min(340, 12 + laneTags.length * 26 + presencePx);
  }, [laneTags.length]);

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

  const hasLaneYAxis = laneTags.length > 0;
  /** 태그 행 있음: Y축만 56px. 없음: 빈 여백만 margin.left 56px → 항상 플롯 시작 = 56px */
  const chartMarginLeft = hasLaneYAxis ? 0 : CHART_GUTTER.left;

  return (
    <div className="flex min-h-[60px] min-w-0 flex-1 flex-col justify-center gap-1 overflow-visible">
      <div
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
              ticks={hasLaneYAxis ? laneYTicks : undefined}
              hide={!hasLaneYAxis}
              tickFormatter={(v) => {
                const k = Math.round(Number(v) - 0.5);
                const tag = laneTags[k];
                if (tag == null) return "";
                return laneTagToDisplayLabel(tag);
              }}
              tick={{ fill: cc.axis, fontSize: 9 }}
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
              apiMarkers.map((marker) => {
                const ls = apiLineStyle(marker);
                return (
                  <ReferenceLine
                    key={marker.key}
                    x={marker.tMs}
                    stroke={ls.stroke}
                    strokeWidth={ls.strokeWidth}
                    strokeDasharray={ls.strokeDasharray}
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
            <Tooltip
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: cc.gridStrong, strokeWidth: 1 }}
              wrapperStyle={{ zIndex: 80, outline: "none" }}
              content={({ active, payload }) => (
                <TimelineTooltipContent active={active} payload={payload} />
              )}
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
      </div>

      {displayFilter.showApiCallMarkers && apiMarkers.length > 0 && (
        <div
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-zinc-500 dark:text-zinc-400"
          style={plotAlignPad}
        >
          <span className="font-medium text-zinc-600 dark:text-zinc-300">API 결과 패턴</span>
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
                    strokeDasharray={ls.strokeDasharray?.replace(/\s+/g, " ")}
                  />
                </svg>
                {API_RESULT_BADGE[cat]}{" "}
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
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  CHART_COLORS,
  SEGMENT_FILL,
  SEGMENT_STROKE,
  colorForStatusIdentity,
  formatStatusRunLabel,
  type SegmentType,
} from "./scheduleTimelineChartTheme";
import type { ApiCallMarker } from "./scheduleTimelineChartUtils";
import {
  buildApiCallMarkers,
  buildDensityMap,
  buildMergedRuns,
  schedulePresenceIdentity,
  scheduleStatusIdentity,
  type MergedRun,
} from "./scheduleTimelineChartUtils";

function formatKst(dt: string): string {
  const d = new Date(dt);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}`;
}

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
}

interface ApiHitPayload {
  x: number;
  y: number;
  kind: "api";
  marker: ApiCallMarker;
}

function StateRunTooltip({ payload }: { payload: DotPayload }) {
  const { run, entry } = payload;
  const first = run.entries[0];
  const last = run.entries[run.entries.length - 1];
  const sameInstant = first.datetime === last.datetime;
  const anyCalls = run.entries.reduce((n, e) => n + e.calls.length, 0);

  return (
    <div
      className="max-w-[280px] rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: CHART_COLORS.tooltipBg,
        borderColor: CHART_COLORS.tooltipBorder,
        color: "#e7e5e4",
      }}
    >
      <div className="mb-1.5 border-b border-white/10 pb-1.5">
        <div className="text-[11px] font-semibold text-stone-100">
          {formatStatusRunLabel(run.identity)}
        </div>
        <div className="mt-0.5 font-mono text-[10px] font-medium tabular-nums text-indigo-300">
          {sameInstant
            ? formatKst(first.datetime)
            : `${formatKst(first.datetime)} → ${formatKst(last.datetime)}`}
        </div>
        {run.entries.length > 1 && (
          <div className="mt-1 text-[10px] text-stone-400">
            동일 상태로 이어진 기록 {run.entries.length}건
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

function ApiCallTooltip({ marker }: { marker: ApiCallMarker }) {
  const { call, scheduleEntry, category } = marker;
  const line = API_RESULT_LINE[category];
  return (
    <div
      className="max-w-[300px] rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: CHART_COLORS.tooltipBg,
        borderColor: CHART_COLORS.tooltipBorder,
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
          {formatKst(new Date(marker.tMs).toISOString())}
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
    return <ApiCallTooltip marker={(raw as ApiHitPayload).marker} />;
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
}

const X_DOMAIN = (rangeStart: Date, rangeEnd: Date): [number, number] => [
  rangeStart.getTime(),
  rangeEnd.getTime(),
];

const PRESENCE_Y = { y1: 0.06, y2: 0.26 } as const;
const STATE_Y = { y1: 0.3, y2: 0.78 } as const;
const DOT_Y = 0.54;
/** 상태 점과 겹침 최소화 — API 세로선 호버는 선 근처에서 유지 */
const API_HIT_Y = 0.38;

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
}: Props) {
  const t0 = rangeStart.getTime();
  const t1 = rangeEnd.getTime();

  const nowX = useMemo(() => {
    const nowMs = Date.now();
    if (nowMs < t0 || nowMs >= t1) return null;
    return nowMs;
  }, [t0, t1]);

  const stateRuns = useMemo(
    () => buildMergedRuns(entries, t1, scheduleStatusIdentity),
    [entries, t1],
  );

  const presenceRuns = useMemo(
    () => buildMergedRuns(entries, t1, schedulePresenceIdentity),
    [entries, t1],
  );

  const apiMarkers = useMemo(() => {
    return buildApiCallMarkers(entries).filter((m) => m.tMs >= t0 && m.tMs < t1);
  }, [entries, t0, t1]);

  const apiHitData = useMemo((): ApiHitPayload[] => {
    if (!displayFilter.showApiCallMarkers) return [];
    return apiMarkers.map((marker) => ({
      x: marker.tMs,
      y: API_HIT_Y,
      kind: "api" as const,
      marker,
    }));
  }, [apiMarkers, displayFilter.showApiCallMarkers]);

  const scatterData = useMemo((): DotPayload[] => {
    if (!displayFilter.showEntryDots) return [];
    return stateRuns.map((run) => {
      const colors = colorForStatusIdentity(run.identity);
      return {
        x: run.tStart,
        y: DOT_Y,
        run,
        entry: run.entries[0],
        statusLabel: displayFilter.showStatusTags ? formatStatusRunLabel(run.identity) : null,
        dotFill: colors.dot,
      };
    });
  }, [displayFilter.showEntryDots, displayFilter.showStatusTags, stateRuns]);

  const heatmapData = useMemo(() => {
    const d = buildDensityMap(entries);
    const max = Math.max(...d, 1);
    return d.map((count, hour) => ({
      hour: String(hour),
      count,
      fill:
        count === 0
          ? "transparent"
          : `rgba(79, 70, 229, ${0.12 + (count / max) * 0.55})`,
    }));
  }, [entries]);

  const tickFormatter = (ts: number) => {
    if (days <= 1) return format(new Date(ts), "HH:mm");
    return format(new Date(ts), "M/d (EEE)", { locale: ko });
  };

  const domain = X_DOMAIN(rangeStart, rangeEnd);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of apiMarkers) {
      const k = x.category;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [apiMarkers]);

  return (
    <div className="flex min-h-[60px] flex-1 flex-col justify-center gap-1 overflow-visible pr-1">
      <div className="relative z-0 h-[48px] w-full min-w-0 overflow-visible">
        <ResponsiveContainer width="100%" height="100%" className="!overflow-visible [&_.recharts-wrapper]:!overflow-visible">
          <ComposedChart
            data={[]}
            margin={{ top: 6, right: 10, bottom: displayFilter.showStatusTags ? 16 : 6, left: 6 }}
            barCategoryGap={0}
          >
            <XAxis
              type="number"
              dataKey="x"
              domain={domain}
              scale="time"
              tickFormatter={tickFormatter}
              tick={{
                fill: CHART_COLORS.axis,
                fontSize: 10,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
              tickLine={{ stroke: CHART_COLORS.gridStrong }}
              axisLine={{ stroke: CHART_COLORS.gridStrong }}
            />
            <YAxis type="number" domain={[0, 1]} hide />
            {displayFilter.showGridLines && (
              <CartesianGrid
                strokeDasharray="4 4"
                stroke={CHART_COLORS.grid}
                vertical
                horizontal={false}
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
                    y1={PRESENCE_Y.y1}
                    y2={PRESENCE_Y.y2}
                    fill={SEGMENT_FILL[seg]}
                    stroke={SEGMENT_STROKE[seg]}
                    strokeWidth={0.5}
                    fillOpacity={1}
                    isAnimationActive={false}
                  />
                );
              })}
            {stateRuns.map((run) => {
              const c = colorForStatusIdentity(run.identity);
              return (
                <ReferenceArea
                  key={`sr-${run.key}`}
                  x1={run.tStart}
                  x2={run.tEnd}
                  y1={STATE_Y.y1}
                  y2={STATE_Y.y2}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={0.6}
                  fillOpacity={1}
                  isAnimationActive={false}
                />
              );
            })}
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
                stroke={CHART_COLORS.now}
                strokeWidth={1}
                strokeDasharray="3 3"
                isFront
              />
            )}
            <Tooltip
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: CHART_COLORS.gridStrong, strokeWidth: 1 }}
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
                        fill="#44403c"
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-[9px] text-stone-500">
          <span className="font-medium text-stone-600">API 결과 패턴</span>
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
                {API_RESULT_BADGE[cat]} <span className="text-stone-400">×{n}</span>
              </span>
            );
          })}
        </div>
      )}

      {days === 1 && displayFilter.showActivityHeatmap && (
        <div className="h-[7px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={heatmapData} margin={{ top: 0, right: 10, left: 6, bottom: 0 }} barCategoryGap={1}>
              <XAxis type="category" dataKey="hour" hide />
              <YAxis type="number" hide domain={[0, "dataMax"]} />
              <Bar dataKey="count" radius={[1, 1, 0, 0]} isAnimationActive={false}>
                {heatmapData.map((h) => (
                  <Cell key={h.hour} fill={h.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

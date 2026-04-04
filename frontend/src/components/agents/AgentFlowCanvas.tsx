"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import {
  buildUtAgentGraph,
  countByHealth,
  getNodeRect,
  type UtAgentNodeData,
  type UtControlNodeData,
  type UtTopologyEdge,
  type UtTopologyNode,
} from "./buildUtAgentGraph";
import { TopologyAgentCard, TopologyControlCard } from "./TopologyNodeCards";

type Rect = { x: number; y: number; w: number; h: number };

/** 사각형 중심에서 (ux,uy) 방향으로 경계까지 거리 */
function boundaryDistance(rect: Rect, ux: number, uy: number): number {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  let t = Infinity;
  if (ux > 1e-9) t = Math.min(t, (rect.x + rect.w - cx) / ux);
  if (ux < -1e-9) t = Math.min(t, (rect.x - cx) / ux);
  if (uy > 1e-9) t = Math.min(t, (rect.y + rect.h - cy) / uy);
  if (uy < -1e-9) t = Math.min(t, (rect.y - cy) / uy);
  return t === Infinity ? 0 : Math.max(t, 0.001);
}

/** 두 노드 중심 연선과 각 카드 경계의 교점 */
function anchorBetween(a: Rect, b: Rect): { x1: number; y1: number; x2: number; y2: number } {
  const cax = a.x + a.w / 2;
  const cay = a.y + a.h / 2;
  const cbx = b.x + b.w / 2;
  const cby = b.y + b.h / 2;
  let dx = cbx - cax;
  let dy = cby - cay;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const ta = boundaryDistance(a, dx, dy);
  const tb = boundaryDistance(b, -dx, -dy);
  return {
    x1: cax + dx * ta,
    y1: cay + dy * ta,
    x2: cbx - dx * tb,
    y2: cby - dy * tb,
  };
}

function cubicBetweenAnchors(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const c1x = x1 + dx * 0.4;
  const c1y = y1 + dy * 0.4;
  const c2x = x1 + dx * 0.62;
  const c2y = y1 + dy * 0.62;
  return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
}

/** 컨트롤(상단) → 에이전트(하단): 하변 중앙 → 수직 → 수평 → 상변 중앙 */
function orthogonalControlToAgent(source: Rect, target: Rect): string {
  const sx = source.x + source.w / 2;
  const sy = source.y + source.h;
  const ex = target.x + target.w / 2;
  const ey = target.y;
  const dy = ey - sy;
  if (dy < 10) {
    const { x1, y1, x2, y2 } = anchorBetween(source, target);
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const my = sy + Math.max(18, Math.min(dy * 0.5, dy - 12));
  return `M ${sx} ${sy} L ${sx} ${my} L ${ex} ${my} L ${ex} ${ey}`;
}

const CONTROL_IDS = new Set(["ut-master", "token-manager", "validator"]);

function TopologyEdgesSvg({
  nodes,
  edges,
  compact,
  layoutWidth,
  layoutHeight,
  flowSourceId,
}: {
  nodes: UtTopologyNode[];
  edges: UtTopologyEdge[];
  compact: boolean;
  layoutWidth: number;
  layoutHeight: number;
  flowSourceId: string | null;
}) {
  const byId = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getNodeRect>>();
    for (const n of nodes) m.set(n.id, getNodeRect(n, compact));
    return m;
  }, [nodes, compact]);

  const drawOrder = useMemo(() => {
    if (!flowSourceId) return edges;
    const back = edges.filter((e) => e.source !== flowSourceId);
    const front = edges.filter((e) => e.source === flowSourceId);
    return [...back, ...front];
  }, [edges, flowSourceId]);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 text-[0]"
      width={layoutWidth}
      height={layoutHeight}
      aria-hidden
    >
      {drawOrder.map((e) => {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        if (!a || !b) return null;
        const d =
          e.curve === "orthogonal"
            ? orthogonalControlToAgent(a, b)
            : (() => {
                const { x1, y1, x2, y2 } = anchorBetween(a, b);
                return e.curve === "straight"
                  ? `M ${x1} ${y1} L ${x2} ${y2}`
                  : cubicBetweenAnchors(x1, y1, x2, y2);
              })();
        const flowActive =
          flowSourceId != null &&
          flowSourceId === e.source &&
          CONTROL_IDS.has(e.source);
        return (
          <path
            key={e.id}
            d={d}
            fill="none"
            stroke={e.stroke}
            strokeWidth={e.strokeWidth}
            strokeDasharray={e.strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={e.opacity ?? 1}
            className={flowActive ? "ut-edge-flow" : undefined}
          />
        );
      })}
    </svg>
  );
}

interface Props {
  agentCount: number;
  compact: boolean;
}

export function AgentFlowCanvas({ agentCount, compact }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flowSourceId, setFlowSourceId] = useState<string | null>(null);

  const { nodes, edges, layoutWidth, layoutHeight } = useMemo(
    () => buildUtAgentGraph({ agentCount, compact }),
    [agentCount, compact],
  );
  const stats = useMemo(() => countByHealth(nodes), [nodes]);

  const applyFit = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sw = el.clientWidth;
    const sh = el.clientHeight;
    if (sw < 32 || sh < 32) return;
    const s = Math.min(sw / layoutWidth, sh / layoutHeight, 1.35) * 0.92;
    setScale(Math.max(0.2, s));
    el.scrollTo({ left: 0, top: 0 });
  }, [layoutWidth, layoutHeight]);

  useEffect(() => {
    applyFit();
  }, [agentCount, compact, applyFit]);

  useEffect(() => {
    setFlowSourceId(null);
  }, [agentCount, compact]);

  useEffect(() => {
    const onFit = () => applyFit();
    window.addEventListener("ut-agent-fit-view", onFit);
    return () => window.removeEventListener("ut-agent-fit-view", onFit);
  }, [applyFit]);

  const zoom = (dir: 1 | -1) => {
    setScale((s) => {
      const next = dir > 0 ? s * 1.15 : s / 1.15;
      return Math.min(2.2, Math.max(0.18, next));
    });
  };

  return (
    <div className="relative flex h-[min(72vh,820px)] min-h-[420px] w-full min-w-0 flex-col rounded-xl border border-zinc-700/90 bg-zinc-950">
      <div className="absolute right-2 top-2 z-20 flex gap-1 rounded-lg border border-zinc-600/80 bg-zinc-900/95 p-0.5 shadow-lg">
        <button
          type="button"
          onClick={() => zoom(1)}
          className="rounded p-1.5 text-zinc-300 hover:bg-zinc-800"
          title="확대"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoom(-1)}
          className="rounded p-1.5 text-zinc-300 hover:bg-zinc-800"
          title="축소"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={applyFit}
          className="rounded p-1.5 text-zinc-300 hover:bg-zinc-800"
          title="화면에 맞춤"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute left-2 top-2 z-20 max-w-[min(100%,18rem)] rounded-lg border border-zinc-600/80 bg-zinc-900/92 p-3 text-[11px] text-zinc-300 shadow-lg backdrop-blur-sm">
        <p className="mb-2 font-semibold text-zinc-100">연결 관계</p>
        <p className="mb-2 text-[10px] leading-snug text-zinc-500">
          연결은 기본 얇은 점선입니다. 컨트롤 카드를 클릭하면 해당 색만 흐름 애니메이션이 켜집니다.
        </p>
        <ul className="space-y-1.5 leading-snug text-zinc-400">
          <li className="flex items-center gap-2">
            <span className="h-0 w-6 shrink-0 border-t border-dashed border-cyan-400/90" style={{ borderTopWidth: 1.5 }} />
            UT Master → 에이전트 (생성·관리·스케줄)
          </li>
          <li className="flex items-center gap-2">
            <span
              className="h-0 w-6 shrink-0 border-t border-dashed border-emerald-400/90"
              style={{ borderTopWidth: 1.5 }}
            />
            Token Manager → 에이전트 (Bearer 갱신)
          </li>
          <li className="flex items-center gap-2">
            <span className="h-0 w-6 shrink-0 border-t border-dashed border-amber-400/90" style={{ borderTopWidth: 1.5 }} />
            Validator → 에이전트 (역할 검사)
          </li>
        </ul>
      </div>

      <div className="absolute right-2 top-[52px] z-20 rounded-lg border border-zinc-600/80 bg-zinc-900/92 px-3 py-2 font-mono text-[10px] text-zinc-400 shadow-lg backdrop-blur-sm tabular-nums">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">UT Agent</div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="text-emerald-400/90">정상 {stats.healthy}</span>
          <span className="text-amber-400/90">주의 {stats.degraded}</span>
          <span className="text-zinc-500">오프 {stats.offline}</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto pt-[120px]"
        style={{ scrollbarGutter: "stable" }}
      >
        <div
          className="relative mx-auto"
          style={{
            width: layoutWidth * scale,
            height: layoutHeight * scale,
            minWidth: "min(100%, 100%)",
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
              width: layoutWidth,
              height: layoutHeight,
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: "radial-gradient(rgb(63 63 70) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            />
            <TopologyEdgesSvg
              nodes={nodes}
              edges={edges}
              compact={compact}
              layoutWidth={layoutWidth}
              layoutHeight={layoutHeight}
              flowSourceId={flowSourceId}
            />
            {nodes.map((n) => {
              const r = getNodeRect(n, compact);
              if (n.type === "utControl") {
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="absolute cursor-pointer text-left outline-none"
                    style={{ left: r.x, top: r.y, width: r.w }}
                    title="클릭: 이 노드에서 에이전트로 가는 연결에 흐름 애니메이션. 다시 클릭하면 끕니다."
                    onClick={() =>
                      setFlowSourceId((cur) => (cur === n.id ? null : n.id))
                    }
                  >
                    <TopologyControlCard
                      data={n.data as UtControlNodeData}
                      selected={flowSourceId === n.id}
                    />
                  </button>
                );
              }
              const ad = n.data as UtAgentNodeData;
              return (
                <button
                  key={n.id}
                  type="button"
                  className="absolute cursor-pointer text-left outline-none"
                  style={{ left: r.x, top: r.y, width: r.w }}
                  onClick={() => setSelectedId((id) => (id === n.id ? null : n.id))}
                >
                  <TopologyAgentCard data={ad} selected={selectedId === n.id} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

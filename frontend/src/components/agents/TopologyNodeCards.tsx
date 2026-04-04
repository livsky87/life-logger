"use client";

import type { CSSProperties } from "react";
import clsx from "clsx";
import { Bot, KeyRound, LayoutGrid, ShieldCheck } from "lucide-react";
import type { UtAgentNodeData, UtControlNodeData } from "./buildUtAgentGraph";

const statusRing: Record<string, string> = {
  healthy: "shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45)]",
  degraded: "shadow-[inset_0_0_0_1px_rgba(251,191,36,0.5)]",
  offline: "shadow-[inset_0_0_0_1px_rgba(161,161,170,0.35)]",
};

const statusDot: Record<string, string> = {
  healthy: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
  degraded: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]",
  offline: "bg-zinc-500",
};

function ControlIcon({ kind }: { kind: UtControlNodeData["kind"] }) {
  const cls = "h-4 w-4 shrink-0";
  if (kind === "utMaster") return <LayoutGrid className={cls + " text-cyan-400"} />;
  if (kind === "tokenManager") return <KeyRound className={cls + " text-emerald-400"} />;
  return <ShieldCheck className={cls + " text-amber-400"} />;
}

export function TopologyControlCard({
  data,
  style,
  selected,
}: {
  data: UtControlNodeData;
  style?: CSSProperties;
  selected?: boolean;
}) {
  return (
    <div
      style={style}
      className={clsx(
        "rounded-xl border border-zinc-700/90 bg-zinc-900/95 px-3 py-2.5 backdrop-blur-sm",
        statusRing[data.status],
        selected && "ring-2 ring-cyan-500/45",
      )}
    >
      <div className="flex items-start gap-2">
        <ControlIcon kind={data.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-zinc-100">{data.label}</span>
            <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", statusDot[data.status])} title={data.status} />
          </div>
          <p className="mt-1 text-[10px] leading-snug text-zinc-400">{data.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export function TopologyAgentCard({
  data,
  style,
  selected,
}: {
  data: UtAgentNodeData;
  style?: CSSProperties;
  selected?: boolean;
}) {
  return (
    <div
      style={style}
      className={clsx(
        "rounded-lg border border-zinc-600/80 bg-zinc-900/90 px-2 py-1.5 backdrop-blur-sm",
        statusRing[data.status],
        selected && "ring-2 ring-cyan-500/50",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Bot className="h-3.5 w-3.5 shrink-0 text-cyan-400/90" />
        <span className="truncate text-[11px] font-semibold text-zinc-100">{data.label}</span>
        <span className={clsx("ml-auto h-1.5 w-1.5 shrink-0 rounded-full", statusDot[data.status])} />
      </div>
      <div className="mt-1 flex justify-between gap-1 border-t border-zinc-700/60 pt-1 font-mono text-[9px] tabular-nums text-zinc-500">
        <span title="토큰 잔여">TTL {data.tokenTtl}</span>
        <span title="검증">{data.validation}</span>
      </div>
    </div>
  );
}

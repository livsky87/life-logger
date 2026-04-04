"use client";

import { useState, useCallback, useEffect } from "react";
import { Network, Maximize2, Info } from "lucide-react";
import clsx from "clsx";
import { AgentFlowCanvas } from "./AgentFlowCanvas";
import { UtAgentWorkspacePanel } from "./UtAgentWorkspacePanel";

const AGENT_PRESETS = [3, 12, 48, 100] as const;

type WsState = {
  sourceNodeId: string;
  workspaceKey: string;
  label: string;
};

export function AgentTopologyPage() {
  const [agentCount, setAgentCount] = useState<number>(3);
  const [compact, setCompact] = useState(false);
  const [ws, setWs] = useState<WsState | null>(null);

  const handleFitHint = useCallback(() => {
    window.dispatchEvent(new Event("ut-agent-fit-view"));
  }, []);

  const onWorkspacePanelToggle = useCallback((p: WsState | null) => {
    setWs(p);
  }, []);

  useEffect(() => {
    setWs(null);
  }, [agentCount, compact]);

  const panelOpen = ws != null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/85 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Agent mesh
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Network className="h-5 w-5 shrink-0 text-cyan-500 dark:text-cyan-400" />
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">UT 에이전트 토폴로지</h1>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Token Manager·UT Master·Validator는 그리드와 정렬해 두었습니다. 연결은 모두 얇은 점선이며, 컨트롤 카드를 클릭하면 해당 색 연결에 흐름 애니메이션이 켜집니다.
            <span className="mt-1 block">
              컨트롤·에이전트 카드를 클릭하면 오른쪽 패널에서{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                ~/.openclaw/workspace-ut-*
              </code>{" "}
              아래 Markdown 문서를 볼 수 있습니다. (예:{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                workspace-ut-master
              </code>
              ,{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                workspace-ut-bot-001
              </code>
              )
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
            {AGENT_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setAgentCount(n);
                  setCompact(n >= 48);
                }}
                className={clsx(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium tabular-nums transition-colors",
                  agentCount === n
                    ? "bg-cyan-500/15 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                )}
              >
                {n}대
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-700">
            <input
              type="checkbox"
              className="rounded border-zinc-400 text-cyan-600 focus:ring-cyan-500 dark:border-zinc-600"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">컴팩트 노드</span>
          </label>
          <button
            type="button"
            onClick={handleFitHint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="캔버스 좌하단 컨트롤에서도 맞춤 보기 가능"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            맞춤 힌트
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[11px] text-zinc-600 dark:border-cyan-500/15 dark:bg-cyan-500/10 dark:text-zinc-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
          <p>
            현재 뷰는 아키텍처 시연용 <strong className="font-medium text-zinc-800 dark:text-zinc-200">목 데이터</strong>입니다.
            추후 UT Master API·실시간 상태 스트림을 연결하면 노드 색·통계·엣지 애니메이션이 자동 반영되도록 확장할 수 있습니다.
          </p>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 gap-3">
          <div
            className={clsx(
              "min-h-[min(72vh,820px)] min-w-0 flex-1 overflow-hidden transition-[opacity] duration-300 ease-out",
              panelOpen && "opacity-[0.98]",
            )}
          >
            <AgentFlowCanvas
              agentCount={agentCount}
              compact={compact}
              workspacePanelNodeId={ws?.sourceNodeId ?? null}
              onWorkspacePanelToggle={onWorkspacePanelToggle}
            />
          </div>
          <div
            className={clsx(
              "min-h-0 shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)]",
              panelOpen
                ? "w-[min(36rem,calc(100vw-2rem),42vw)] min-w-[min(18rem,100%)] opacity-100"
                : "w-0 min-w-0 opacity-0 pointer-events-none",
            )}
          >
            {ws && (
              <div className="h-full w-full min-w-0">
                <UtAgentWorkspacePanel
                  key={ws.workspaceKey}
                  workspaceKey={ws.workspaceKey}
                  nodeLabel={ws.label}
                  onClose={() => setWs(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

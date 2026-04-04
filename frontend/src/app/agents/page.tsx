import dynamic from "next/dynamic";

const AgentTopologyPage = dynamic(
  () => import("@/components/agents/AgentTopologyPage").then((m) => m.AgentTopologyPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 bg-white/90 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/85 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-6 w-48 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-10 max-w-xl animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-9 w-36 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
          <div className="h-14 shrink-0 animate-pulse rounded-lg bg-cyan-500/10 dark:bg-cyan-500/15" />
          <div className="min-h-[max(420px,min(72vh,820px))] flex-1 animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        </div>
      </div>
    ),
  },
);

export default function AgentsRoutePage() {
  return <AgentTopologyPage />;
}

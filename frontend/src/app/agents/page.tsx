import dynamic from "next/dynamic";

const AgentTopologyPage = dynamic(
  () => import("@/components/agents/AgentTopologyPage").then((m) => m.AgentTopologyPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        토폴로지 캔버스 로딩 중…
      </div>
    ),
  },
);

export default function AgentsRoutePage() {
  return <AgentTopologyPage />;
}

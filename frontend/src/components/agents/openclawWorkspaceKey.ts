/** OpenClaw 기준 하위 디렉터리 이름 (API / UI 공통). */

const CONTROL_WORKSPACE: Record<string, string> = {
  "ut-master": "workspace-ut-master",
  "token-manager": "workspace-ut-token-manager",
  "validator": "workspace-ut-validator",
};

export function nodeIdToWorkspaceKey(nodeId: string, nodeType: "utControl" | "utAgent"): string | null {
  if (nodeType === "utAgent") {
    const m = /^ut-agent-(\d+)$/.exec(nodeId);
    if (!m) return null;
    const i = parseInt(m[1], 10);
    return `workspace-ut-bot-${String(i + 1).padStart(3, "0")}`;
  }
  return CONTROL_WORKSPACE[nodeId] ?? null;
}

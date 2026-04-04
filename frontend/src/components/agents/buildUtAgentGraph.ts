export type AgentHealth = "healthy" | "degraded" | "offline";

export type ControlPlaneKind = "utMaster" | "tokenManager" | "validator";

export type UtControlNodeData = {
  kind: ControlPlaneKind;
  label: string;
  subtitle: string;
  status: AgentHealth;
};

export type UtAgentNodeData = {
  kind: "utAgent";
  agentId: string;
  label: string;
  status: AgentHealth;
  tokenTtl: string;
  validation: string;
};

export type UtTopologyNode = {
  id: string;
  type: "utControl" | "utAgent";
  position: { x: number; y: number };
  data: UtControlNodeData | UtAgentNodeData;
};

export type UtTopologyEdge = {
  id: string;
  source: string;
  target: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity?: number;
  /** smooth: 베지어, orthogonal: 컨트롤 하단→에이전트 상단 직각, straight: 앵커 직선 */
  curve?: "smooth" | "straight" | "orthogonal";
};

const MASTER_W = 240;
const CTRL_W = 220;
export const CONTROL_H = 92;
const LAYOUT_PAD = 56;

export function agentNodeSize(compact: boolean): { w: number; h: number } {
  return { w: compact ? 118 : 168, h: compact ? 48 : 68 };
}

const SAMPLE_AGENT_NAMES = ["홈 A", "홈 B", "홈 C"];

function stableHealth(seed: string): AgentHealth {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const r = Math.abs(h) % 100;
  if (r < 78) return "healthy";
  if (r < 93) return "degraded";
  return "offline";
}

function agentLabel(index: number): string {
  if (index < SAMPLE_AGENT_NAMES.length) return SAMPLE_AGENT_NAMES[index];
  return `UT Agent ${index + 1}`;
}

export interface BuildGraphOptions {
  agentCount: number;
  compact: boolean;
}

export interface UtAgentLayoutResult {
  nodes: UtTopologyNode[];
  edges: UtTopologyEdge[];
  layoutWidth: number;
  layoutHeight: number;
}

function boundsOfNodes(nodes: UtTopologyNode[], compact: boolean): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const r = getNodeRect(n, compact);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { minX, minY, maxX, maxY };
}

export function buildUtAgentGraph({ agentCount, compact }: BuildGraphOptions): UtAgentLayoutResult {
  const { w: agentW, h: agentH } = agentNodeSize(compact);
  const gapCtrl = compact ? 20 : 28;
  const gx = compact ? 14 : 20;
  const gy = compact ? 12 : 16;
  const marginTop = compact ? 40 : 48;
  /** 직각 연결 3레인 + 그리드 간 여유 */
  const gapAfterControls = compact ? 64 : 84;
  const sidePad = compact ? 20 : 28;

  /** 행을 줄이고 좌·우 컨트롤과 열 방향을 맞추기 위해 열을 약간 늘림 */
  const cols = Math.max(1, Math.ceil(Math.sqrt(agentCount * 1.38)));
  const gridW = cols * agentW + (cols - 1) * gx;
  /** Master 카드가 그리드보다 넓을 때 밴드로 맞춰 겹침·휘어짐 방지 */
  const bandW = Math.max(gridW, MASTER_W + 32);
  const agentInsetX = (bandW - gridW) / 2;

  /** Token(좌) — 에이전트 밴드 — Validator(우), Master는 밴드 가로 중앙 위 */
  const gridOffsetX = sidePad + CTRL_W + gapCtrl;
  const layoutContentW = gridOffsetX + bandW + gapCtrl + CTRL_W + sidePad;
  const masterX = gridOffsetX + (bandW - MASTER_W) / 2;
  const controlsY = marginTop;
  const gridTop = controlsY + CONTROL_H + gapAfterControls;

  const nodes: UtTopologyNode[] = [
    {
      id: "token-manager",
      type: "utControl",
      position: { x: sidePad, y: controlsY },
      data: {
        kind: "tokenManager",
        label: "Token Manager",
        subtitle: "Bearer 토큰 선제 갱신",
        status: "healthy",
      },
    },
    {
      id: "ut-master",
      type: "utControl",
      position: { x: masterX, y: controlsY },
      data: {
        kind: "utMaster",
        label: "UT Master",
        subtitle: "에이전트 생성 · 생명주기 · Life Logger 스케줄 연동",
        status: "healthy",
      },
    },
    {
      id: "validator",
      type: "utControl",
      position: { x: gridOffsetX + bandW + gapCtrl, y: controlsY },
      data: {
        kind: "validator",
        label: "Validator",
        subtitle: "역할 수행 · 지속 검사",
        status: "healthy",
      },
    },
  ];

  for (let i = 0; i < agentCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const id = `ut-agent-${i}`;
    const health = stableHealth(id);
    nodes.push({
      id,
      type: "utAgent",
      position: {
        x: gridOffsetX + agentInsetX + col * (agentW + gx),
        y: gridTop + row * (agentH + gy),
      },
      data: {
        kind: "utAgent",
        agentId: id,
        label: agentLabel(i),
        status: health,
        tokenTtl: health === "offline" ? "—" : `${12 + (i % 40)}m`,
        validation: health === "healthy" ? "통과" : health === "degraded" ? "주의" : "미수신",
      },
    });
  }

  const { minX, minY, maxX, maxY } = boundsOfNodes(nodes, compact);
  const ox = LAYOUT_PAD - minX;
  const oy = LAYOUT_PAD - minY;
  for (const n of nodes) {
    n.position.x += ox;
    n.position.y += oy;
  }

  const layoutWidth = Math.ceil(maxX - minX + 2 * LAYOUT_PAD);
  const layoutHeight = Math.ceil(maxY - minY + 2 * LAYOUT_PAD);

  const edges: UtTopologyEdge[] = [];
  const edgeW = compact ? 0.65 : 0.8;
  const edgeDash = "4 5";
  const edgeOpacity = compact ? 0.48 : 0.52;
  for (let i = 0; i < agentCount; i++) {
    const id = `ut-agent-${i}`;
    edges.push({
      id: `e-master-${i}`,
      source: "ut-master",
      target: id,
      stroke: "rgb(34, 211, 238)",
      strokeWidth: edgeW,
      strokeDasharray: edgeDash,
      opacity: edgeOpacity,
      curve: "orthogonal",
    });
    edges.push({
      id: `e-token-${i}`,
      source: "token-manager",
      target: id,
      stroke: "rgb(52, 211, 153)",
      strokeWidth: edgeW,
      strokeDasharray: edgeDash,
      opacity: edgeOpacity,
      curve: "orthogonal",
    });
    edges.push({
      id: `e-val-${i}`,
      source: "validator",
      target: id,
      stroke: "rgb(251, 191, 36)",
      strokeWidth: edgeW,
      strokeDasharray: edgeDash,
      opacity: edgeOpacity,
      curve: "orthogonal",
    });
  }

  return { nodes, edges, layoutWidth, layoutHeight };
}

export function countByHealth(nodes: UtTopologyNode[]): Record<AgentHealth, number> {
  const out: Record<AgentHealth, number> = { healthy: 0, degraded: 0, offline: 0 };
  for (const n of nodes) {
    if (n.data.kind === "utAgent") out[n.data.status]++;
  }
  return out;
}

export function getNodeRect(
  node: UtTopologyNode,
  compact: boolean,
): { x: number; y: number; w: number; h: number } {
  if (node.type === "utControl") {
    const w = node.id === "ut-master" ? MASTER_W : CTRL_W;
    return { x: node.position.x, y: node.position.y, w, h: CONTROL_H };
  }
  const { w, h } = agentNodeSize(compact);
  return { x: node.position.x, y: node.position.y, w, h };
}

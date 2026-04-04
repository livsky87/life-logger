export type SegmentType = "home" | "away" | "transit" | "work";

/** API 응답(result) 문자열 분류 — 선 색·패턴 */
export type ResultCategory = "success" | "expected" | "error" | "empty" | "other";

export const API_RESULT_LINE: Record<
  ResultCategory,
  { stroke: string; strokeWidth: number; strokeDasharray?: string }
> = {
  success: { stroke: "#16a34a", strokeWidth: 1.75 },
  expected: { stroke: "#ca8a04", strokeWidth: 1.5, strokeDasharray: "2 3" },
  error: { stroke: "#dc2626", strokeWidth: 2.25, strokeDasharray: "4 2" },
  empty: { stroke: "#a8a29e", strokeWidth: 1.25, strokeDasharray: "1 4" },
  other: { stroke: "#6366f1", strokeWidth: 1.5, strokeDasharray: "3 2" },
};

export const API_RESULT_BADGE: Record<ResultCategory, string> = {
  success: "성공",
  expected: "기대값",
  error: "오류",
  empty: "결과 없음",
  other: "기타",
};

export type ChartUiTheme = "light" | "dark";

/** 라이트 패널 / 다크 패널 각각에 맞는 격자·축·툴팁 */
export const CHART_COLORS_BY_THEME: Record<
  ChartUiTheme,
  {
    grid: string;
    gridStrong: string;
    axis: string;
    now: string;
    connector: string;
    tooltipBg: string;
    tooltipBorder: string;
    apiAccent: string;
    statusTagFill: string;
  }
> = {
  light: {
    grid: "#e7e5e4",
    gridStrong: "#d6d3d1",
    axis: "#78716c",
    now: "#dc2626",
    connector: "rgba(120, 113, 108, 0.35)",
    tooltipBg: "#1c1917",
    tooltipBorder: "#44403c",
    apiAccent: "#d97706",
    statusTagFill: "#44403c",
  },
  dark: {
    grid: "#3f3f46",
    gridStrong: "#52525b",
    axis: "#a1a1aa",
    now: "#f87171",
    connector: "rgba(161, 161, 170, 0.35)",
    tooltipBg: "#09090b",
    tooltipBorder: "#3f3f46",
    apiAccent: "#fbbf24",
    statusTagFill: "#d4d4d8",
  },
};

export function getChartColors(theme: ChartUiTheme) {
  return CHART_COLORS_BY_THEME[theme];
}

/** @deprecated getChartColors 사용 권장 */
export const CHART_COLORS = CHART_COLORS_BY_THEME.light;

export const SEGMENT_FILL: Record<SegmentType, string> = {
  home: "rgba(99, 102, 241, 0.32)",
  away: "rgba(163, 163, 163, 0.45)",
  transit: "rgba(245, 158, 11, 0.38)",
  work: "rgba(139, 92, 246, 0.32)",
};

export const SEGMENT_STROKE: Record<SegmentType, string> = {
  home: "rgba(79, 70, 229, 0.45)",
  away: "rgba(115, 115, 115, 0.4)",
  transit: "rgba(217, 119, 6, 0.5)",
  work: "rgba(124, 58, 237, 0.45)",
};

export const SEGMENT_DOT: Record<SegmentType, string> = {
  home: "#4f46e5",
  away: "#737373",
  transit: "#d97706",
  work: "#7c3aed",
};

/** 병합된 상태 구간 — 첫 태그 기준 (복합 태그는 해시/첫 태그) */
const STATUS_RUN_THEME: Record<string, { fill: string; stroke: string; dot: string }> = {
  수면: { fill: "rgba(100, 116, 139, 0.36)", stroke: "rgba(71, 85, 105, 0.5)", dot: "#475569" },
  요리: { fill: "rgba(234, 88, 12, 0.32)", stroke: "rgba(194, 65, 12, 0.5)", dot: "#c2410c" },
  설거지: { fill: "rgba(2, 132, 199, 0.32)", stroke: "rgba(3, 105, 161, 0.5)", dot: "#0369a1" },
  청소: { fill: "rgba(5, 150, 105, 0.32)", stroke: "rgba(4, 120, 87, 0.5)", dot: "#047857" },
  식사: { fill: "rgba(202, 138, 4, 0.34)", stroke: "rgba(161, 98, 7, 0.5)", dot: "#a16207" },
  운동: { fill: "rgba(22, 163, 74, 0.32)", stroke: "rgba(21, 128, 61, 0.5)", dot: "#15803d" },
  업무: { fill: "rgba(124, 58, 237, 0.32)", stroke: "rgba(109, 40, 217, 0.5)", dot: "#6d28d9" },
  외출: { fill: "rgba(225, 29, 72, 0.28)", stroke: "rgba(190, 18, 60, 0.48)", dot: "#be123c" },
  귀가: { fill: "rgba(13, 148, 136, 0.32)", stroke: "rgba(15, 118, 110, 0.5)", dot: "#0f766e" },
  "펫 활동": { fill: "rgba(219, 39, 119, 0.28)", stroke: "rgba(190, 24, 93, 0.48)", dot: "#be185d" },
};

function hashToRunColors(identity: string): { fill: string; stroke: string; dot: string } {
  let h = 0;
  for (let i = 0; i < identity.length; i++) h = (h * 31 + identity.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return {
    fill: `hsla(${hue}, 52%, 50%, 0.32)`,
    stroke: `hsla(${hue}, 52%, 36%, 0.52)`,
    dot: `hsl(${hue}, 55%, 40%)`,
  };
}

export function colorForStatusIdentity(identity: string): { fill: string; stroke: string; dot: string } {
  if (!identity) {
    return {
      fill: "rgba(168, 162, 158, 0.28)",
      stroke: "rgba(120, 113, 108, 0.42)",
      dot: "#78716c",
    };
  }
  const primary = identity.split("\u0001")[0];
  return STATUS_RUN_THEME[primary] ?? hashToRunColors(identity);
}

export function formatStatusRunLabel(identity: string): string {
  if (!identity) return "상태 없음";
  return identity.split("\u0001").join(" · ");
}

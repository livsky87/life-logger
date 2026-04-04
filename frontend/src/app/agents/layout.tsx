import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UT 에이전트 토폴로지 | Life Logger",
  description: "UT Master, Token Manager, Validator와 UT Agent 간 제어·토큰·검증 관계를 다이어그램으로 조회합니다.",
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

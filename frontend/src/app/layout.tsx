import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Life Logger — UT Agent 콘솔 | Home Data Engine",
  description:
    "Home Data Engine 산하 UT Agent를 관리·분석하는 Life Logger입니다. 스케줄, 타임라인, 시뮬레이션을 한곳에서 다룹니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="scrollbar-app font-sans antialiased">
        <ThemeScript />
        <ThemeProvider>
          <QueryProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="app-main-canvas flex-1 overflow-auto">{children}</main>
            </div>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Life Logger",
  description: "실시간 라이프로그 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <QueryProvider>
          <div className="min-h-screen flex flex-col">
            <header className="bg-gray-900 text-white px-4 py-3 flex items-center gap-4 shadow">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center text-sm font-bold">
                  L
                </div>
                <span className="font-semibold text-base">Life Logger</span>
              </div>
              <nav className="flex items-center gap-0.5 overflow-x-auto">
                <NavLink href="/timeline" label="타임라인" icon="📊" />
                <NavLink href="/schedule" label="스케줄" icon="🗓️" />
                <NavLink href="/simulation" label="시뮬레이션" icon="🏠" />
                <NavLink href="/locations" label="위치·사용자" icon="⚙️" />
                <NavLink href="/logs" label="로그" icon="📋" />
              </nav>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition whitespace-nowrap"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

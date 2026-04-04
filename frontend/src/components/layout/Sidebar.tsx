"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  CalendarDays,
  HomeIcon,
  MapPin,
  Network,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Activity,
  Sun,
  Moon,
} from "lucide-react";
import { useAppTheme } from "@/components/providers/ThemeProvider";

const NAV_ITEMS = [
  { href: "/agents", icon: Network, label: "UT 에이전트" },
  { href: "/timeline", icon: BarChart2, label: "타임라인" },
  { href: "/schedule", icon: CalendarDays, label: "스케줄" },
  { href: "/simulation", icon: HomeIcon, label: "시뮬레이션" },
  { href: "/locations", icon: MapPin, label: "위치·사용자" },
  { href: "/logs", icon: ScrollText, label: "로그" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useAppTheme();

  return (
    <aside
      className={`
        relative flex flex-col shrink-0 border-r transition-[width] duration-200 ease-in-out
        border-zinc-800/90 bg-zinc-950 bg-[linear-gradient(180deg,rgb(9_9_11)_0%,rgb(24_24_27)_45%,rgb(9_9_11)_100%)]
        dark:border-zinc-800/90
        ${collapsed ? "w-[60px]" : "w-[220px]"}
      `}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"
        aria-hidden
      />

      <div className="flex h-14 shrink-0 items-center gap-2.5 overflow-hidden border-b border-zinc-800/80 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500/90 to-teal-600 shadow-[0_0_20px_-4px_rgba(34,211,238,0.45)]">
          <Activity className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-zinc-100">Life Logger</span>
            <span className="block truncate text-[10px] font-medium tracking-wide text-zinc-500">
              HDE · UT Agent System
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-hidden py-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`
                group mx-2 mb-0.5 flex h-10 items-center gap-3 rounded-md px-4 transition-colors duration-100
                ${active
                  ? "bg-cyan-500/10 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]"
                  : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100"
                }
              `}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-300"}`}
              />
              {!collapsed && <span className="whitespace-nowrap text-sm font-medium">{label}</span>}
              {active && !collapsed && <div className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-zinc-800/80 p-2">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={`
            flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors
            text-zinc-400 hover:bg-zinc-800/90 hover:text-zinc-100
            ${collapsed ? "justify-center px-0" : ""}
          `}
          title={collapsed ? (theme === "dark" ? "라이트 모드" : "다크 모드") : undefined}
        >
          {theme === "dark" ? <Sun className="h-4 w-4 shrink-0 text-amber-400/90" /> : <Moon className="h-4 w-4 shrink-0 text-cyan-400/90" />}
          {!collapsed && <span className="font-medium">{theme === "dark" ? "라이트 모드" : "다크 모드"}</span>}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-[52px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title={collapsed ? "펼치기" : "접기"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}

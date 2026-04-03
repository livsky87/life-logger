"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  CalendarDays,
  HomeIcon,
  MapPin,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/timeline", icon: BarChart2, label: "타임라인" },
  { href: "/schedule", icon: CalendarDays, label: "스케줄" },
  { href: "/simulation", icon: HomeIcon, label: "시뮬레이션" },
  { href: "/locations", icon: MapPin, label: "위치·사용자" },
  { href: "/logs", icon: ScrollText, label: "로그" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`
        relative flex flex-col shrink-0 bg-neutral-950 border-r border-neutral-800
        transition-[width] duration-200 ease-in-out
        ${collapsed ? "w-[60px]" : "w-[220px]"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-neutral-800 shrink-0 overflow-hidden">
        <div className="shrink-0 w-7 h-7 rounded bg-indigo-600 flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
            Life Logger
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-hidden">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 h-10 px-4 mx-2 rounded-md mb-0.5
                transition-colors duration-100 group
                ${active
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                }
              `}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={`shrink-0 w-4 h-4 ${active ? "text-indigo-400" : "text-neutral-500 group-hover:text-neutral-300"}`}
              />
              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{label}</span>
              )}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-[52px] w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors z-10"
        title={collapsed ? "펼치기" : "접기"}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}

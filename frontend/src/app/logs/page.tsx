"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, subDays, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { useSchedules } from "@/application/useSchedules";
import { useUsers } from "@/application/useUsers";
import type { Schedule, ScheduleCall } from "@/domain/scheduleTypes";

function todayAsInt(): number {
  const now = new Date();
  return Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);
}

function dateIntToDate(n: number): Date {
  const s = String(n);
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
}

function dateToInt(d: Date): number {
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
}

function CallDetail({ call, idx }: { call: ScheduleCall; idx: number }) {
  const [open, setOpen] = useState(false);
  const isSuccess = call.result?.toLowerCase().includes("success") || call.result?.toLowerCase().includes("expected");
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
      >
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${call.method === "POST" ? "bg-blue-100 text-blue-700" : call.method === "GET" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {call.method}
        </span>
        <span className="flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">
          {call.url.replace("{deviceId}", call.deviceId || "{deviceId}")}
        </span>
        {call.dsec > 0 && <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">+{call.dsec}s</span>}
        {call.result && (
          <span className={`text-xs shrink-0 ${isSuccess ? "text-green-600" : "text-red-500"}`}>
            {isSuccess ? "✓" : "✗"}
          </span>
        )}
        <svg className={`h-3 w-3 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${open ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"/>
        </svg>
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-zinc-100 bg-zinc-50 px-4 pb-3 pt-1 dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex gap-2 text-xs">
            <span className="shrink-0 text-zinc-500 dark:text-zinc-400">device:</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-200">{call.deviceId || "-"}</span>
          </div>
          {call.commands.length > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="shrink-0 text-zinc-500 dark:text-zinc-400">commands:</span>
              <pre className="whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {JSON.stringify(call.commands, null, 2)}
              </pre>
            </div>
          )}
          {call.result && (
            <div className="flex gap-2 text-xs">
              <span className="shrink-0 text-zinc-500 dark:text-zinc-400">result:</span>
              <span className={`font-mono ${isSuccess ? "text-green-700" : "text-red-600"}`}>{call.result}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleCallLog({ entry }: { entry: Schedule }) {
  if (entry.calls.length === 0) return null;
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-start gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
        <span className="mt-0.5 w-10 shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {(() => { const d = new Date(entry.datetime); const k = new Date(d.getTime() + 9*3600000); return `${String(k.getUTCHours()).padStart(2,"0")}:${String(k.getUTCMinutes()).padStart(2,"0")}`; })()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm text-zinc-800 dark:text-zinc-100">{entry.description}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{entry.location}</span>
            {entry.status.map((s) => (
              <span
                key={s}
                className="rounded border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
          ⚡ {entry.calls.length}건
        </span>
      </div>
      <div className="space-y-2 bg-white p-3 dark:bg-zinc-950/40">
        {entry.calls.map((call, i) => (
          <CallDetail key={i} call={call} idx={i} />
        ))}
      </div>
    </div>
  );
}

function LogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initUserId = searchParams.get("userId") ?? "";
  const initDate = (() => {
    const d = searchParams.get("date");
    return d ? Number(d) : todayAsInt();
  })();

  const [selectedUserId, setSelectedUserId] = useState(initUserId);
  const [dateInt, setDateInt] = useState(initDate);

  const { data: users = [] } = useUsers();
  const { data: schedules, isLoading } = useSchedules(dateInt, selectedUserId || null);

  const currentDate = dateIntToDate(dateInt);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedUserId) params.set("userId", selectedUserId);
    params.set("date", String(dateInt));
    router.replace(`/logs?${params.toString()}`, { scroll: false });
  }, [selectedUserId, dateInt, router]);

  const shiftDay = (dir: 1 | -1) => {
    const d = dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1);
    setDateInt(dateToInt(d));
  };

  const entriesWithCalls = (schedules ?? []).filter((e) => e.calls.length > 0);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">로그</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">스케줄 기반 API 호출 내역을 조회합니다</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-sm font-medium text-zinc-600 dark:text-zinc-400">사용자</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">전체</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => shiftDay(-1)}
          className="rounded-lg border border-zinc-200 p-2 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setDateInt(todayAsInt())}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          오늘
        </button>
        <button
          onClick={() => shiftDay(1)}
          className="rounded-lg border border-zinc-200 p-2 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {format(currentDate, "yyyy년 M월 d일 (EEE)", { locale: ko })}
        </span>

        {entriesWithCalls.length > 0 && (
          <span className="ml-auto text-sm text-zinc-500 dark:text-zinc-400">
            총 {entriesWithCalls.reduce((s, e) => s + e.calls.length, 0)}건 호출
          </span>
        )}
      </div>

      <div>
        {isLoading ? (
          <div className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">로딩 중...</div>
        ) : entriesWithCalls.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500">
            이 날짜에 API 호출 기록이 없습니다
          </div>
        ) : (
          entriesWithCalls.map((entry) => (
            <ScheduleCallLog key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-400 dark:text-zinc-500">로딩 중...</div>}>
      <LogsContent />
    </Suspense>
  );
}

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
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition"
      >
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${call.method === "POST" ? "bg-blue-100 text-blue-700" : call.method === "GET" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {call.method}
        </span>
        <span className="text-xs text-gray-600 flex-1 truncate font-mono">{call.url.replace("{deviceId}", call.deviceId || "{deviceId}")}</span>
        {call.dsec > 0 && <span className="text-xs text-gray-400 shrink-0">+{call.dsec}s</span>}
        {call.result && (
          <span className={`text-xs shrink-0 ${isSuccess ? "text-green-600" : "text-red-500"}`}>
            {isSuccess ? "✓" : "✗"}
          </span>
        )}
        <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"/>
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 bg-gray-50 border-t border-gray-100 space-y-1.5">
          <div className="flex gap-2 text-xs">
            <span className="text-gray-500 shrink-0">device:</span>
            <span className="font-mono text-gray-700">{call.deviceId || "-"}</span>
          </div>
          {call.commands.length > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500 shrink-0">commands:</span>
              <pre className="text-gray-700 text-[10px] leading-relaxed whitespace-pre-wrap">{JSON.stringify(call.commands, null, 2)}</pre>
            </div>
          )}
          {call.result && (
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500 shrink-0">result:</span>
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
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-mono text-gray-500 shrink-0 mt-0.5 w-10">
          {(() => { const d = new Date(entry.timestamp); const k = new Date(d.getTime() + 9*3600000); return `${String(k.getUTCHours()).padStart(2,"0")}:${String(k.getUTCMinutes()).padStart(2,"0")}`; })()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-800 truncate">{entry.description}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{entry.location}</span>
            {entry.status.map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">{s}</span>
            ))}
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          ⚡ {entry.calls.length}건
        </span>
      </div>
      <div className="p-3 space-y-2 bg-white">
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">로그</h1>
        <p className="text-gray-500 text-sm mt-1">스케줄 기반 API 호출 내역을 조회합니다</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 shrink-0">사용자</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">전체</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={() => setDateInt(todayAsInt())} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition">
          오늘
        </button>
        <button onClick={() => shiftDay(1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-700">
          {format(currentDate, "yyyy년 M월 d일 (EEE)", { locale: ko })}
        </span>

        {entriesWithCalls.length > 0 && (
          <span className="ml-auto text-sm text-gray-500">총 {entriesWithCalls.reduce((s, e) => s + e.calls.length, 0)}건 호출</span>
        )}
      </div>

      <div>
        {isLoading ? (
          <div className="text-center text-gray-400 text-sm py-16">로딩 중...</div>
        ) : entriesWithCalls.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-16 bg-white rounded-2xl border border-gray-200">
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
    <Suspense fallback={<div className="p-6 text-gray-400">로딩 중...</div>}>
      <LogsContent />
    </Suspense>
  );
}

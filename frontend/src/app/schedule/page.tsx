"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import clsx from "clsx";
import type { Schedule, ScheduleCreate, ScheduleUpdate } from "@/domain/scheduleTypes";
import { useCreateSchedule, useDeleteSchedule, useSchedules, useUpdateSchedule } from "@/application/useSchedules";
import { useUsers } from "@/application/useUsers";
import { ScheduleEntryForm } from "@/components/manage/ScheduleEntryForm";
import { Tooltip } from "@/components/ui/Tooltip";
import { Toast, type ToastType } from "@/components/ui/Toast";

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

function formatEntryTime(datetime: string): string {
  const d = new Date(datetime);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}`;
}

function isPastEntry(entry: Schedule): boolean {
  return new Date(entry.datetime) < new Date();
}


function CallsTooltipContent({ calls }: { calls: Schedule["calls"] }) {
  if (!calls.length) return null;
  return (
    <div className="space-y-1.5 min-w-[240px]">
      <p className="font-semibold text-xs text-gray-300 mb-1">API 호출 목록</p>
      {calls.map((c, i) => (
        <div key={i} className="border-b border-white/10 pb-1.5 last:border-0 last:pb-0">
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-300 font-mono font-bold text-xs">{c.method}</span>
            <span className="text-blue-300 text-xs truncate max-w-[160px]">{c.url}</span>
          </div>
          {c.deviceId && (
            <div className="text-gray-400 text-xs font-mono mt-0.5">
              device: {c.deviceId.slice(0, 8)}…
            </div>
          )}
          <div className="flex gap-3 text-gray-400 text-xs mt-0.5">
            {c.commands.length > 0 && <span>commands: {c.commands.length}개</span>}
            {c.dsec > 0 && <span>@{c.dsec}초</span>}
            {c.result && (
              <span className={c.result === "success" ? "text-green-400" : "text-red-400"}>
                {c.result}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SchedulePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initUserId = searchParams.get("userId") ?? "";
  const initDate = (() => {
    const d = searchParams.get("date");
    return d ? Number(d) : todayAsInt();
  })();

  const [selectedUserId, setSelectedUserId] = useState<string>(initUserId);
  const [dateInt, setDateInt] = useState<number>(initDate);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const { data: users = [] } = useUsers();
  const { data: schedules, isLoading } = useSchedules(dateInt, selectedUserId || null);
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const currentDate = dateIntToDate(dateInt);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedUserId) params.set("userId", selectedUserId);
    params.set("date", String(dateInt));
    router.replace(`/schedule?${params.toString()}`, { scroll: false });
  }, [selectedUserId, dateInt, router]);

  const shiftDay = (dir: 1 | -1) => {
    const d = dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1);
    setDateInt(dateToInt(d));
  };

  const handleSave = useCallback(async (data: ScheduleCreate | ScheduleUpdate) => {
    try {
      const withUser = { ...data, user_id: selectedUserId || null };
      if (editTarget) {
        await updateSchedule.mutateAsync({ id: editTarget.id, body: withUser as ScheduleUpdate });
        setToast({ message: "스케줄이 수정됐습니다.", type: "success" });
      } else {
        await createSchedule.mutateAsync(withUser as ScheduleCreate);
        setToast({ message: "스케줄이 추가됐습니다.", type: "success" });
      }
      setEditTarget(null);
      setShowForm(false);
    } catch {
      setToast({ message: "저장에 실패했습니다.", type: "error" });
    }
  }, [editTarget, createSchedule, updateSchedule, selectedUserId]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteSchedule.mutateAsync({ id, date: dateInt });
      setToast({ message: "스케줄이 삭제됐습니다.", type: "success" });
      setConfirmDelete(null);
    } catch {
      setToast({ message: "삭제에 실패했습니다.", type: "error" });
    }
  }, [deleteSchedule, dateInt]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">스케줄</h1>
        <p className="text-gray-500 text-sm mt-1">분 단위 일정을 관리합니다</p>
      </div>

      {/* User selector + date navigator */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* User selector */}
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

        {/* Date navigator */}
        <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={() => setDateInt(todayInt)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition">
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
        {selectedUser && (
          <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
            {selectedUser.name}
          </span>
        )}
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="ml-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          + 항목 추가
        </button>
      </div>

      {/* Schedule feed */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {isLoading ? (
          <div className="text-center text-gray-400 text-sm py-12">로딩 중...</div>
        ) : !schedules?.length ? (
          <div className="text-center text-gray-400 text-sm py-12">이 날짜에 스케줄이 없습니다.</div>
        ) : (
          <div className="space-y-1">
            {schedules.map((entry) => {
              const past = isPastEntry(entry);
              return (
                <div
                  key={entry.id}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition group",
                    past
                      ? "bg-gray-50 border-gray-100 text-gray-500"
                      : "bg-white border-gray-200 text-gray-800",
                  )}
                >
                  <span className="text-xs font-mono w-10 shrink-0 text-gray-500">
                    {formatEntryTime(entry.datetime)}
                  </span>
                  {entry.location && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                      {entry.location}
                    </span>
                  )}
                  <span className={clsx("text-xs shrink-0", entry.is_home ? "text-blue-500" : "text-gray-400")}>
                    {entry.is_home ? "🏠" : "🚶"}
                  </span>
                  <span className="flex-1 text-sm truncate">{entry.description}</span>
                  {entry.calls.length > 0 && (
                    <Tooltip content={<CallsTooltipContent calls={entry.calls} />}>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 cursor-default shrink-0">
                        ⚡ {entry.calls.length}건
                      </span>
                    </Tooltip>
                  )}
                  {entry.status.length > 0 && entry.status.map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                      {s}
                    </span>
                  ))}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => { setEditTarget(entry); setShowForm(true); }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 px-1"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => setConfirmDelete(entry.id)}
                      className="text-xs text-red-400 hover:text-red-600 px-1"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <ScheduleEntryForm
          initialDate={dateInt}
          initialData={editTarget ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <h4 className="font-semibold text-gray-900 mb-2">삭제 확인</h4>
            <p className="text-sm text-gray-500 mb-5">이 스케줄 항목을 삭제하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">로딩 중...</div>}>
      <SchedulePageContent />
    </Suspense>
  );
}

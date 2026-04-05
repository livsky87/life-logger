"use client";

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, subDays, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Home, LogOut, Zap } from "lucide-react";
import clsx from "clsx";
import type { Schedule, ScheduleCreate, ScheduleUpdate } from "@/domain/scheduleTypes";
import { useCreateSchedule, useDeleteSchedule, useSchedules, useUpdateSchedule } from "@/application/useSchedules";
import { useUsers } from "@/application/useUsers";
import { ScheduleEntryForm } from "@/components/manage/ScheduleEntryForm";
import { Tooltip } from "@/components/ui/Tooltip";
import { Toast, type ToastType } from "@/components/ui/Toast";
import { useAdminAuth } from "@/components/providers/AdminAuthProvider";
import { useIsClientCalendarToday } from "@/lib/useClientToday";

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
  return formatInTimeZone(parseISO(datetime), "Asia/Seoul", "HH:mm:ss");
}

function isPastEntry(entry: Schedule): boolean {
  return new Date(entry.datetime) < new Date();
}

/** 현재 시각 이후(포함)로 가장 빨리 도래하는 일정 id — 목록이 비어 있으면 null */
function nextUpcomingScheduleId(entries: Schedule[]): number | null {
  const now = Date.now();
  const sorted = [...entries].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
  );
  const next = sorted.find((e) => new Date(e.datetime).getTime() >= now);
  return next?.id ?? null;
}


function CallsTooltipContent({ calls }: { calls: Schedule["calls"] }) {
  if (!calls.length) return null;
  return (
    <div className="space-y-1.5 min-w-[240px]">
      <p className="font-semibold text-xs text-gray-300 mb-1">Device 호출 목록</p>
      {calls.map((c, i) => (
        <div key={i} className="border-b border-white/10 pb-1.5 last:border-0 last:pb-0">
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-300 font-mono font-bold text-xs">{c.method}</span>
            <span className="text-blue-300 text-xs truncate max-w-[160px]">{c.url}</span>
          </div>
          {c.deviceId && (
            <div className="text-gray-400 text-xs font-mono mt-0.5">
              Device: {c.deviceId.slice(0, 8)}…
            </div>
          )}
          <div className="flex gap-3 text-gray-400 text-xs mt-0.5">
            {c.commands.length > 0 && <span>commands: {c.commands.length}개</span>}
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
  const pastEditCloseWarnedRef = useRef(false);
  const { isAdmin } = useAdminAuth();

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

  const handleSave = useCallback(
    async (data: ScheduleCreate | ScheduleUpdate) => {
      if (editTarget && isPastEntry(editTarget)) {
        setToast({ message: "이미 지난 스케줄은 수정할 수 없습니다.", type: "error" });
        setShowForm(false);
        setEditTarget(null);
        return;
      }
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
    },
    [editTarget, createSchedule, updateSchedule, selectedUserId],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      const target = schedules?.find((s) => s.id === id);
      if (target && isPastEntry(target)) {
        setToast({ message: "이미 지난 스케줄은 삭제할 수 없습니다.", type: "error" });
        setConfirmDelete(null);
        return;
      }
      try {
        await deleteSchedule.mutateAsync({ id, date: dateInt });
        setToast({ message: "스케줄이 삭제됐습니다.", type: "success" });
        setConfirmDelete(null);
      } catch {
        setToast({ message: "삭제에 실패했습니다.", type: "error" });
      }
    },
    [deleteSchedule, dateInt, schedules],
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const isTodayDate = useIsClientCalendarToday(currentDate);

  /** 현재 시각이 바뀌면 ‘다음 일정’ 하이라이트가 다음 행으로 넘어가도록 주기 갱신 */
  const [scheduleClockTick, setScheduleClockTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setScheduleClockTick((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    pastEditCloseWarnedRef.current = false;
  }, [editTarget?.id]);

  useEffect(() => {
    if (!isAdmin) {
      setShowForm(false);
      setEditTarget(null);
      setConfirmDelete(null);
    }
  }, [isAdmin]);

  /** 수정 폼을 연 채로 일정 시각이 지나면 자동 종료(저장은 이미 불가) */
  useEffect(() => {
    if (!showForm || !editTarget || !isPastEntry(editTarget)) return;
    if (pastEditCloseWarnedRef.current) return;
    pastEditCloseWarnedRef.current = true;
    setToast({ message: "이 일정의 시각이 지나 편집을 종료합니다.", type: "error" });
    setShowForm(false);
    setEditTarget(null);
  }, [scheduleClockTick, showForm, editTarget]);

  const highlightedNextId = useMemo(
    () => (schedules?.length ? nextUpcomingScheduleId(schedules) : null),
    [schedules, scheduleClockTick],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-w-0 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="shrink-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider leading-none text-zinc-400 dark:text-zinc-500">
            Schedule
          </p>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {format(currentDate, "yyyy년 M월 d일", { locale: ko })}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-sm font-medium ${
                isTodayDate
                  ? "bg-cyan-500/15 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {format(currentDate, "EEE", { locale: ko })}
              {isTodayDate && " · 오늘"}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          >
            <option value="">전체 사용자</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {!isTodayDate && (
            <button
              onClick={() => setDateInt(todayAsInt())}
              className="flex items-center gap-1.5 rounded border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              오늘
            </button>
          )}
          <div className="flex items-center overflow-hidden rounded border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => shiftDay(-1)}
              className="border-r border-zinc-200 p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shiftDay(1)}
              className="p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            disabled={!isAdmin}
            title={!isAdmin ? "관리자 로그인 후 사용할 수 있습니다" : undefined}
            onClick={() => {
              if (!isAdmin) return;
              setEditTarget(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-cyan-600 dark:hover:bg-cyan-500"
          >
            <Plus className="w-3.5 h-3.5" />
            항목 추가
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto max-w-5xl min-w-0 overflow-x-auto overflow-y-visible rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">로딩 중…</div>
        ) : !schedules?.length ? (
          <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">이 날짜에 스케줄이 없습니다.</div>
        ) : (
          <div className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {schedules.map((entry) => {
              const past = isPastEntry(entry);
              const isNextUp = !past && highlightedNextId === entry.id;
              return (
                <div
                  key={entry.id}
                  className={clsx(
                    "group flex min-w-0 items-start gap-2 px-4 py-2.5 transition-colors hover:bg-zinc-50 sm:items-center sm:gap-3 dark:hover:bg-zinc-800/50",
                    past ? "opacity-50" : "",
                    isNextUp && "schedule-next-highlight",
                  )}
                >
                  <span className="w-[5.75rem] shrink-0 pt-0.5 font-mono text-xs tabular-nums text-zinc-400 sm:pt-0 dark:text-zinc-500">
                    {formatEntryTime(entry.datetime)}
                  </span>
                  <div className="w-[9.5rem] shrink-0 pt-0.5 sm:flex sm:items-center sm:pt-0">
                    {entry.location ? (
                      <span
                        title={entry.location}
                        className="block max-w-full truncate rounded border border-zinc-200 bg-zinc-50 px-1.5 py-px text-left text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
                      >
                        {entry.location}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="flex h-5 w-9 shrink-0 items-center justify-center pt-0.5 sm:pt-0"
                    title={entry.is_home ? "재실" : "부재"}
                  >
                    {entry.is_home ? (
                      <Home className="h-3.5 w-3.5 shrink-0 text-cyan-500 dark:text-cyan-400" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-0.5 sm:py-0">
                    <div className="truncate text-zinc-800 dark:text-zinc-100">{entry.description}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-2 md:gap-3">
                    {entry.calls.length > 0 ? (
                      <Tooltip content={<CallsTooltipContent calls={entry.calls} />}>
                        <span className="inline-flex cursor-default items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-px text-[11px] text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400">
                          <Zap className="h-2.5 w-2.5" />
                          {entry.calls.length}
                        </span>
                      </Tooltip>
                    ) : null}
                    {entry.status.length > 0 && (
                      <div className="flex max-w-[min(100vw-12rem,22rem)] flex-wrap justify-end gap-1.5 sm:max-w-xs md:max-w-sm">
                        {entry.status.map((s) => (
                          <span
                            key={s}
                            className="inline-block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs leading-snug text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      className={clsx(
                        "flex shrink-0 items-center justify-end gap-1",
                        past ? "" : isAdmin ? "opacity-0 transition group-hover:opacity-100" : "",
                      )}
                    >
                      {past ? (
                        <>
                          <span
                            className="pointer-events-none invisible rounded px-1.5 py-0.5 text-xs"
                            aria-hidden
                          >
                            수정
                          </span>
                          <span
                            className="pointer-events-none invisible rounded px-1.5 py-0.5 text-xs"
                            aria-hidden
                          >
                            삭제
                          </span>
                        </>
                      ) : isAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditTarget(entry);
                              setShowForm(true);
                            }}
                            className="rounded px-1.5 py-0.5 text-xs text-cyan-600 transition-colors hover:bg-cyan-500/10 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(entry.id)}
                            className="rounded px-1.5 py-0.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          >
                            삭제
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">조회만</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {showForm && isAdmin && (
        <ScheduleEntryForm
          initialDate={dateInt}
          initialData={editTarget ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="w-80 rounded-lg border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <h4 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">삭제 확인</h4>
            <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">이 스케줄 항목을 삭제하시겠습니까?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded border border-zinc-200 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 rounded bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
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
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400 dark:text-zinc-500">로딩 중…</div>}>
      <SchedulePageContent />
    </Suspense>
  );
}

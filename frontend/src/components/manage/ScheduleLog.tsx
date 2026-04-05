"use client";

import { useState, useCallback } from "react";
import clsx from "clsx";
import { format, addDays, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import type { Schedule, ScheduleCreate, ScheduleUpdate } from "@/domain/scheduleTypes";
import { useCreateSchedule, useDeleteSchedule, useSchedules, useUpdateSchedule } from "@/application/useSchedules";
import { ScheduleEntryForm } from "./ScheduleEntryForm";
import { Tooltip } from "@/components/ui/Tooltip";

interface Props {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

function todayAsInt(): number {
  const now = new Date();
  return Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);
}

function dateIntToDate(n: number): Date {
  const s = String(n);
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
}

function scheduleDayInt(entry: Schedule): number {
  const d = new Date(entry.datetime);
  return Number(
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`,
  );
}

function isPastEntry(entry: Schedule, todayInt: number): boolean {
  const dInt = scheduleDayInt(entry);
  if (dInt < todayInt) return true;
  if (dInt > todayInt) return false;
  return new Date(entry.datetime) < new Date();
}

function formatScheduleHm(entry: Schedule): string {
  const d = new Date(entry.datetime);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function statusDotClass(tags: string[]): string {
  const s = tags.join(" ").toLowerCase();
  if (/error|오류|fail|실패/i.test(s)) return "bg-red-500";
  if (/warn|경고|주의/i.test(s)) return "bg-yellow-400";
  if (tags.length === 0) return "bg-gray-400";
  return "bg-green-500";
}

function statusTooltip(tags: string[]): string {
  if (tags.length === 0) return "상태 태그 없음";
  return tags.join(" · ");
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

export function ScheduleLog({ onSuccess, onError }: Props) {
  const [dateInt, setDateInt] = useState<number>(todayAsInt);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: schedules, isLoading } = useSchedules(dateInt);
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const todayInt = todayAsInt();
  const currentDate = dateIntToDate(dateInt);

  const shiftDay = (dir: 1 | -1) => {
    const d = dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1);
    const n = Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
    setDateInt(n);
  };

  const handleSave = useCallback(async (data: ScheduleCreate | ScheduleUpdate) => {
    if (editTarget) {
      await updateSchedule.mutateAsync({ id: editTarget.id, body: data as ScheduleUpdate });
      onSuccess("스케줄이 수정됐습니다.");
    } else {
      await createSchedule.mutateAsync(data as ScheduleCreate);
      onSuccess("스케줄이 추가됐습니다.");
    }
    setEditTarget(null);
    setShowForm(false);
  }, [editTarget, createSchedule, updateSchedule, onSuccess]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteSchedule.mutateAsync({ id, date: dateInt });
      onSuccess("스케줄이 삭제됐습니다.");
      setConfirmDelete(null);
    } catch {
      onError("삭제에 실패했습니다.");
    }
  }, [deleteSchedule, dateInt, onSuccess, onError]);

  return (
    <div>
      {/* Date navigator */}
      <div className="flex items-center gap-3 mb-5">
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
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="ml-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          + 항목 추가
        </button>
      </div>

      {/* Schedule feed */}
      {isLoading ? (
        <div className="text-center text-gray-400 text-sm py-12">로딩 중...</div>
      ) : !schedules?.length ? (
        <div className="text-center text-gray-400 text-sm py-12">이 날짜에 스케줄이 없습니다.</div>
      ) : (
        <div className="space-y-1">
          {schedules.map((entry) => {
            const past = isPastEntry(entry, todayInt);
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
                {/* Time */}
                <span className="text-xs font-mono w-10 shrink-0 text-gray-500">
                  {formatScheduleHm(entry)}
                </span>

                {/* Location tag */}
                {entry.location && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                    {entry.location}
                  </span>
                )}

                {/* isHome indicator */}
                <span className={clsx("text-xs shrink-0", entry.is_home ? "text-blue-500" : "text-gray-400")}>
                  {entry.is_home ? "🏠" : "🚶"}
                </span>

                {/* Description */}
                <span className="flex-1 text-sm truncate">{entry.description}</span>

                {/* Calls badge */}
                {entry.calls.length > 0 && (
                  <Tooltip content={<CallsTooltipContent calls={entry.calls} />}>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 cursor-default shrink-0">
                      ⚡ {entry.calls.length}건
                    </span>
                  </Tooltip>
                )}

                {/* Status dot (복수 태그) */}
                <Tooltip content={<span>{statusTooltip(entry.status)}</span>}>
                  <span className={clsx("h-3 w-3 shrink-0 rounded-full", statusDotClass(entry.status))} />
                </Tooltip>

                {/* Actions */}
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

      {/* Form modal */}
      {showForm && (
        <ScheduleEntryForm
          initialDate={dateInt}
          initialData={editTarget ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <h4 className="font-semibold text-gray-900 mb-2">삭제 확인</h4>
            <p className="text-sm text-gray-500 mb-5">이 스케줄 항목을 삭제하시겠습니까?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, subDays, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { useSchedules } from "@/application/useSchedules";
import { useUsers } from "@/application/useUsers";
import type { Schedule } from "@/domain/scheduleTypes";
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

const LOCATION_BG: Record<string, string> = {
  "우리 집": "bg-blue-50 border-blue-200 dark:bg-blue-950/45 dark:border-blue-800",
  "이동 중": "bg-amber-50 border-amber-200 dark:bg-amber-950/35 dark:border-amber-800",
  "회사": "bg-purple-50 border-purple-200 dark:bg-purple-950/45 dark:border-purple-800",
  "외부": "bg-orange-50 border-orange-200 dark:bg-orange-950/35 dark:border-orange-800",
};

const LOCATION_ICON: Record<string, string> = {
  "우리 집": "🏠",
  "이동 중": "🚶",
  "회사": "🏢",
  "외부": "🌍",
};

const STATUS_COLORS: Record<string, string> = {
  수면: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200",
  요리: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
  설거지: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200",
  청소: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200",
  "펫 활동": "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-200",
  "펫 수면": "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
};

function SimulationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initUserId = searchParams.get("userId") ?? "";
  const initDate = (() => {
    const d = searchParams.get("date");
    return d ? Number(d) : todayAsInt();
  })();

  const [selectedUserId, setSelectedUserId] = useState(initUserId);
  const [dateInt, setDateInt] = useState(initDate);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms per step
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: users = [] } = useUsers();
  const { data: schedules, isLoading } = useSchedules(dateInt, selectedUserId || null);

  const entries = schedules ?? [];
  const currentEntry = entries[currentStep] ?? null;
  const totalSteps = entries.length;
  const currentDate = dateIntToDate(dateInt);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedUserId) params.set("userId", selectedUserId);
    params.set("date", String(dateInt));
    router.replace(`/simulation?${params.toString()}`, { scroll: false });
  }, [selectedUserId, dateInt, router]);

  // Auto-play
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((s) => {
          if (s >= totalSteps - 1) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, totalSteps]);

  // Reset step when user/date changes
  useEffect(() => {
    setCurrentStep(0);
    setPlaying(false);
  }, [selectedUserId, dateInt]);

  const shiftDay = (dir: 1 | -1) => {
    const d = dir > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1);
    setDateInt(dateToInt(d));
  };

  function formatKst(timestamp: string): string {
    const d = new Date(timestamp);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return `${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}`;
  }

  const timeStr = currentEntry ? formatKst(currentEntry.datetime) : "--:--";

  const progressPct = totalSteps > 0 ? (currentStep / Math.max(1, totalSteps - 1)) * 100 : 0;
  const locBg = currentEntry
    ? (LOCATION_BG[currentEntry.location] ??
        "bg-zinc-100 border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-700")
    : "bg-zinc-100 border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-700";
  const locIcon = currentEntry ? (LOCATION_ICON[currentEntry.location] ?? "📍") : "📍";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">시뮬레이션</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">스케줄 기반 하루 행동 시뮬레이션</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-sm font-medium text-zinc-600 dark:text-zinc-400">사용자</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">선택</option>
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
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-zinc-400 dark:text-zinc-500">로딩 중...</div>
      ) : !selectedUserId ? (
        <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500">
          위에서 사용자를 선택하세요
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500">
          이 날짜에 스케줄 데이터가 없습니다
        </div>
      ) : (
        <>
          {/* Main activity card */}
          <div className={`rounded-2xl border-2 p-6 mb-4 transition-all duration-500 ${locBg}`}>
            <div className="flex items-start gap-4">
              <div className="text-4xl">{locIcon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-50">{timeStr}</span>
                  <span className="rounded-full border border-white/80 bg-white/70 px-2 py-0.5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300">
                    {currentEntry?.location ?? ""}
                  </span>
                  {currentEntry?.status.map((s) => (
                    <span
                      key={s}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s] ?? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"}`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-base leading-relaxed text-zinc-800 dark:text-zinc-100">
                  {currentEntry?.description ?? ""}
                </p>
                {currentEntry && currentEntry.calls.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {currentEntry.calls.map((call, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-white/80 bg-white/70 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950/40"
                      >
                        <span className="text-amber-500">⚡</span>
                        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">{call.method}</span>
                        <span className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                          {call.deviceId || call.url.slice(0, 40)}
                        </span>
                        {call.dsec > 0 && (
                          <span className="ml-auto shrink-0 text-xs text-zinc-400 dark:text-zinc-500">+{call.dsec}s</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-zinc-400 dark:text-zinc-500">
              <span>
                스텝 {currentStep + 1} / {totalSteps}
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-300 dark:bg-cyan-600"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {/* Clickable step markers */}
            <div className="relative h-4 mt-1">
              {entries.map((e, i) => {
                const leftPct = totalSteps > 1 ? (i / (totalSteps - 1)) * 100 : 0;
                return (
                  <button
                    key={e.id}
                    onClick={() => setCurrentStep(i)}
                    className={`absolute top-1 h-2 w-2 -translate-x-1/2 rounded-full transition-all ${i === currentStep ? "scale-150 bg-cyan-600 dark:bg-cyan-500" : "bg-zinc-300 hover:bg-cyan-400 dark:bg-zinc-600 dark:hover:bg-cyan-500"}`}
                    style={{ left: `${leftPct}%` }}
                    title={`${formatKst(e.datetime)} ${e.description.slice(0, 20)}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Playback controls */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setCurrentStep(0);
                setPlaying(false);
              }}
              className="rounded-lg border border-zinc-200 p-2 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              title="처음으로"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"/></svg>
            </button>
            <button
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              className="rounded-lg border border-zinc-200 p-2 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500"
            >
              {playing ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  일시정지
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/></svg>
                  재생
                </>
              )}
            </button>
            <button
              onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
              className="rounded-lg border border-zinc-200 p-2 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            {/* Speed control */}
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
            >
              <option value={2000}>0.5×</option>
              <option value={1000}>1×</option>
              <option value={500}>2×</option>
              <option value={250}>4×</option>
            </select>
          </div>

          {/* Entry list */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
              전체 일정
            </div>
            <div className="max-h-64 divide-y divide-zinc-50 overflow-y-auto dark:divide-zinc-800">
              {entries.map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => setCurrentStep(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                    i === currentStep
                      ? "bg-cyan-500/10 dark:bg-cyan-500/15"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <span className="w-10 shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {formatKst(entry.datetime)}
                  </span>
                  <span
                    className={`flex-1 truncate text-sm ${
                      i === currentStep
                        ? "font-medium text-cyan-900 dark:text-cyan-200"
                        : "text-zinc-700 dark:text-zinc-200"
                    }`}
                  >
                    {entry.description}
                  </span>
                  {entry.calls.length > 0 && (
                    <span className="shrink-0 text-xs text-amber-500">⚡{entry.calls.length}</span>
                  )}
                  {i === currentStep && <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-400" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-400 dark:text-zinc-500">로딩 중...</div>}>
      <SimulationContent />
    </Suspense>
  );
}

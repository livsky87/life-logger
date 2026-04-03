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
  "우리 집": "bg-blue-50 border-blue-200",
  "이동 중": "bg-amber-50 border-amber-200",
  "회사": "bg-purple-50 border-purple-200",
  "외부": "bg-orange-50 border-orange-200",
};

const LOCATION_ICON: Record<string, string> = {
  "우리 집": "🏠",
  "이동 중": "🚶",
  "회사": "🏢",
  "외부": "🌍",
};

const STATUS_COLORS: Record<string, string> = {
  "수면": "bg-indigo-100 text-indigo-700",
  "요리": "bg-orange-100 text-orange-700",
  "설거지": "bg-cyan-100 text-cyan-700",
  "청소": "bg-green-100 text-green-700",
  "펫 활동": "bg-pink-100 text-pink-700",
  "펫 수면": "bg-pink-100 text-pink-600",
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
  const locBg = currentEntry ? (LOCATION_BG[currentEntry.location] ?? "bg-gray-50 border-gray-200") : "bg-gray-50 border-gray-200";
  const locIcon = currentEntry ? (LOCATION_ICON[currentEntry.location] ?? "📍") : "📍";

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">시뮬레이션</h1>
        <p className="text-gray-500 text-sm mt-1">스케줄 기반 하루 행동 시뮬레이션</p>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 shrink-0">사용자</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">선택</option>
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
        <button onClick={() => setDateInt(todayAsInt())} className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition">오늘</button>
        <button onClick={() => shiftDay(1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-700">
          {format(currentDate, "yyyy년 M월 d일 (EEE)", { locale: ko })}
        </span>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-16">로딩 중...</div>
      ) : !selectedUserId ? (
        <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-200">
          위에서 사용자를 선택하세요
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-gray-200">
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
                  <span className="text-2xl font-bold text-gray-900 font-mono">{timeStr}</span>
                  <span className="text-sm text-gray-600 px-2 py-0.5 rounded-full bg-white/60 border border-white">
                    {currentEntry?.location ?? ""}
                  </span>
                  {currentEntry?.status.map((s) => (
                    <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s] ?? "bg-gray-100 text-gray-600"}`}>{s}</span>
                  ))}
                </div>
                <p className="text-gray-800 text-base leading-relaxed">
                  {currentEntry?.description ?? ""}
                </p>
                {currentEntry && currentEntry.calls.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {currentEntry.calls.map((call, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-white/70 rounded-lg px-3 py-1.5 border border-white">
                        <span className="text-amber-500">⚡</span>
                        <span className="text-xs font-mono font-bold text-blue-600">{call.method}</span>
                        <span className="text-xs text-gray-600 truncate">{call.deviceId || call.url.slice(0, 40)}</span>
                        {call.dsec > 0 && <span className="text-xs text-gray-400 ml-auto shrink-0">+{call.dsec}s</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>스텝 {currentStep + 1} / {totalSteps}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
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
                    className={`absolute w-2 h-2 rounded-full -translate-x-1/2 top-1 transition-all ${i === currentStep ? "bg-indigo-600 scale-150" : "bg-gray-300 hover:bg-indigo-300"}`}
                    style={{ left: `${leftPct}%` }}
                    title={`${formatKst(e.datetime)} ${e.description.slice(0, 20)}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-3 justify-center mb-6">
            <button
              onClick={() => { setCurrentStep(0); setPlaying(false); }}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
              title="처음으로"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"/></svg>
            </button>
            <button
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
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
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            {/* Speed control */}
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600"
            >
              <option value={2000}>0.5×</option>
              <option value={1000}>1×</option>
              <option value={500}>2×</option>
              <option value={250}>4×</option>
            </select>
          </div>

          {/* Entry list */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-700">전체 일정</div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {entries.map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => setCurrentStep(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${i === currentStep ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                >
                  <span className="text-xs font-mono text-gray-500 shrink-0 w-10">
                    {formatKst(entry.datetime)}
                  </span>
                  <span className={`text-sm truncate flex-1 ${i === currentStep ? "font-medium text-indigo-800" : "text-gray-700"}`}>
                    {entry.description}
                  </span>
                  {entry.calls.length > 0 && (
                    <span className="text-amber-500 text-xs shrink-0">⚡{entry.calls.length}</span>
                  )}
                  {i === currentStep && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
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
    <Suspense fallback={<div className="p-6 text-gray-400">로딩 중...</div>}>
      <SimulationContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import type { Simulation, SimulationCreate, SmartThingsDevice } from "@/domain/simulationTypes";
import type { Schedule, ScheduleCall } from "@/domain/scheduleTypes";
import { useSimulations, useCreateSimulation, useUpdateSimulation, useDeleteSimulation } from "@/application/useSimulations";
import { useSchedules } from "@/application/useSchedules";
import { useHomePresenceStatus } from "@/application/useSmartThings";
import { FloorPlan } from "./FloorPlan";
import { PlaybackControls } from "./PlaybackControls";
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

export function SimulationView({ onSuccess, onError }: Props) {
  const [selectedSimId, setSelectedSimId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<number>(todayAsInt);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSimForm, setShowSimForm] = useState(false);
  const [editSim, setEditSim] = useState<Simulation | null>(null);

  const { data: simulations = [], isLoading: simsLoading } = useSimulations();
  const { data: schedules = [] } = useSchedules(scheduleDate);
  const { data: homePresence } = useHomePresenceStatus();

  const createSim = useCreateSimulation();
  const updateSim = useUpdateSimulation();
  const deleteSim = useDeleteSimulation();

  const selectedSim = simulations.find((s) => s.id === selectedSimId) ?? null;

  // Auto-select first simulation
  useEffect(() => {
    if (simulations.length > 0 && selectedSimId === null) {
      setSelectedSimId(simulations[0].id);
    }
  }, [simulations, selectedSimId]);

  // Reset playback when schedules change
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [scheduleDate, selectedSimId]);

  // Playback tick
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying || schedules.length === 0) return;

    const intervalMs = 60_000 / speed;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= schedules.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, schedules.length]);

  const currentEntry = schedules[currentIndex] ?? null;
  const currentCalls: ScheduleCall[] = currentEntry?.calls ?? [];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = new Date(e.target.value);
    if (!isNaN(d.getTime())) {
      const n = Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
      setScheduleDate(n);
    }
  };

  const dateForInput = (() => {
    try { return format(dateIntToDate(scheduleDate), "yyyy-MM-dd"); } catch { return ""; }
  })();

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
        {/* Simulation selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 shrink-0">시뮬레이션</label>
          <select
            value={selectedSimId ?? ""}
            onChange={(e) => setSelectedSimId(e.target.value ? Number(e.target.value) : null)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {simulations.length === 0 && <option value="">구성 없음</option>}
            {simulations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 shrink-0">날짜</label>
          <input
            type="date"
            value={dateForInput}
            onChange={handleDateChange}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Home Presence status */}
        {homePresence && (
          <Tooltip
            content={
              <div className="space-y-1 min-w-[180px]">
                <p className="font-semibold text-gray-300 mb-1">🏠 재실 상태</p>
                <div className="text-gray-400 text-xs space-y-0.5">
                  <div><span className="text-gray-500">inferenceId:</span> {homePresence.inferenceId}</div>
                  <div><span className="text-gray-500">locationId:</span> {homePresence.locationId}</div>
                  <div><span className="text-gray-500">version:</span> {homePresence.version}</div>
                  <div>
                    <span className="text-gray-500">result:</span>{" "}
                    <span className={homePresence.result === "home" ? "text-green-400" : "text-amber-400"}>
                      {homePresence.result}
                    </span>
                  </div>
                  {homePresence.feedback?.feedback && (
                    <div><span className="text-gray-500">feedback:</span> {homePresence.feedback.feedback}</div>
                  )}
                </div>
              </div>
            }
          >
            <span className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-default",
              homePresence.result === "home"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              <span className={clsx(
                "w-1.5 h-1.5 rounded-full",
                homePresence.result === "home" ? "bg-green-500" : "bg-amber-400"
              )} />
              {homePresence.result === "home" ? "집 안" : "집 밖"}
            </span>
          </Tooltip>
        )}

        {/* Simulation CRUD */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => { setEditSim(null); setShowSimForm(true); }}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            + 구성 추가
          </button>
          {selectedSim && (
            <>
              <button
                onClick={() => { setEditSim(selectedSim); setShowSimForm(true); }}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition"
              >
                수정
              </button>
              <button
                onClick={async () => {
                  if (!confirm("이 시뮬레이션 구성을 삭제하시겠습니까?")) return;
                  try {
                    await deleteSim.mutateAsync(selectedSim.id);
                    setSelectedSimId(null);
                    onSuccess("시뮬레이션 구성이 삭제됐습니다.");
                  } catch { onError("삭제에 실패했습니다."); }
                }}
                className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* Floor plan */}
      {selectedSim ? (
        <FloorPlan
          devices={selectedSim.devices}
          personLocation={currentEntry?.location ?? ""}
          isHome={currentEntry?.is_home ?? true}
          recentCalls={currentCalls}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          {simsLoading ? "로딩 중..." : "시뮬레이션 구성을 선택하거나 추가해주세요."}
        </div>
      )}

      {/* Playback controls */}
      <PlaybackControls
        entries={schedules}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        speed={speed}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onSpeedChange={setSpeed}
        onSeek={(idx) => { setCurrentIndex(idx); setIsPlaying(false); }}
      />

      {/* Simulation form modal */}
      {showSimForm && (
        <SimulationForm
          initialData={editSim ?? undefined}
          onSave={async (data) => {
            try {
              if (editSim) {
                await updateSim.mutateAsync({ id: editSim.id, body: data });
                onSuccess("시뮬레이션 구성이 수정됐습니다.");
              } else {
                const created = await createSim.mutateAsync(data);
                setSelectedSimId(created.id);
                onSuccess("시뮬레이션 구성이 추가됐습니다.");
              }
              setShowSimForm(false);
              setEditSim(null);
            } catch { onError("저장에 실패했습니다."); }
          }}
          onClose={() => { setShowSimForm(false); setEditSim(null); }}
        />
      )}
    </div>
  );
}

// ── Inline simulation form (create/edit) ──────────────────────────────────────

interface SimFormProps {
  initialData?: Simulation;
  onSave: (data: SimulationCreate) => Promise<void>;
  onClose: () => void;
}

function SimulationForm({ initialData, onSave, onClose }: SimFormProps) {
  const [locationId, setLocationId] = useState(initialData?.location_id ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [devicesJson, setDevicesJson] = useState(
    initialData ? JSON.stringify(initialData.devices, null, 2) : "[]"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("이름을 입력해주세요."); return; }
    let devices: SmartThingsDevice[];
    try {
      devices = JSON.parse(devicesJson) as SmartThingsDevice[];
    } catch {
      setError("devices JSON 형식이 올바르지 않습니다."); return;
    }
    setError("");
    setLoading(true);
    try {
      await onSave({ location_id: locationId, name: name.trim(), devices, metadata: {} });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">
              {initialData ? "시뮬레이션 수정" : "시뮬레이션 추가"}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="예: 우리집 2층"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SmartThings Location ID</label>
              <input
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="xxxx-xxxx-xxxx-xxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devices (JSON)
                <span className="ml-1 text-xs text-gray-400">— SmartThings devices 배열, roomId 포함</span>
              </label>
              <textarea
                value={devicesJson}
                onChange={(e) => setDevicesJson(e.target.value)}
                rows={10}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                spellCheck={false}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                취소
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                {loading ? "저장 중..." : initialData ? "수정" : "추가"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

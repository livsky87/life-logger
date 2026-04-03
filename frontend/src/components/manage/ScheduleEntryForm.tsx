"use client";

import { useState } from "react";
import type { Schedule, ScheduleCall, ScheduleCreate, ScheduleUpdate } from "@/domain/scheduleTypes";

interface Props {
  initialDate: number;  // YYYYMMDD — used as default date in the timestamp picker
  initialData?: Schedule;
  onSave: (data: ScheduleCreate | ScheduleUpdate) => Promise<void>;
  onClose: () => void;
}

const EMPTY_CALL: ScheduleCall = { method: "POST", url: "", deviceId: "", commands: [], dsec: 0, result: null };

/** Convert YYYYMMDD int + current time to datetime-local string (YYYY-MM-DDTHH:MM) */
function dateIntToLocalDefault(dateInt: number): string {
  const s = String(dateInt);
  const now = new Date();
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Convert ISO timestamp to datetime-local string for the input */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const mo = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const da = String(kst.getUTCDate()).padStart(2, "0");
  const h = String(kst.getUTCHours()).padStart(2, "0");
  const mi = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

/** Convert datetime-local input value to ISO 8601 with +09:00 */
function localInputToIso(localStr: string): string {
  // localStr is like "2026-04-02T06:57"
  return `${localStr}:00+09:00`;
}

export function ScheduleEntryForm({ initialDate, initialData, onSave, onClose }: Props) {
  const isEdit = !!initialData;

  const defaultTimestamp = initialData
    ? isoToLocalInput(initialData.datetime)
    : dateIntToLocalDefault(initialDate);

  const [timestamp, setTimestamp] = useState(defaultTimestamp);
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [isHome, setIsHome] = useState(initialData?.is_home ?? true);
  const [statusInput, setStatusInput] = useState<string>(initialData?.status.join(", ") ?? "");
  const [calls, setCalls] = useState<ScheduleCall[]>(initialData?.calls ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addCall = () => setCalls((prev) => [...prev, { ...EMPTY_CALL }]);
  const removeCall = (i: number) => setCalls((prev) => prev.filter((_, idx) => idx !== i));
  const updateCall = (i: number, field: keyof ScheduleCall, value: string | number | null) => {
    setCalls((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { setError("설명을 입력해주세요."); return; }
    if (!timestamp) { setError("날짜/시간을 입력해주세요."); return; }
    setError("");
    setLoading(true);
    try {
      const statusArr = statusInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await onSave({
        datetime: localInputToIso(timestamp),
        description: description.trim(),
        location: location.trim(),
        is_home: isHome,
        status: statusArr,
        calls,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEdit ? "스케줄 수정" : "스케줄 추가"}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Timestamp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날짜·시간 (KST)</label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                placeholder="어떤 일이 있었나요?"
                required
              />
            </div>

            {/* Location + isHome */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">위치</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="예: 부엌, 거실"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">집 안 여부</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsHome(true)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                      isHome ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    집 안
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHome(false)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                      !isHome ? "bg-gray-600 border-gray-600 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    집 밖
                  </button>
                </div>
              </div>
            </div>

            {/* Status tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">활동 태그 (쉼표 구분)</label>
              <input
                type="text"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="예: 요리, 청소"
              />
            </div>

            {/* API Calls */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">API 호출</label>
                <button
                  type="button"
                  onClick={addCall}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + 추가
                </button>
              </div>
              <div className="space-y-3">
                {calls.map((call, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">호출 #{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeCall(i)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Method</label>
                        <select
                          value={call.method}
                          onChange={(e) => updateCall(i, "method", e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                        >
                          {["GET","POST","PUT","PATCH","DELETE"].map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500">URL</label>
                        <input
                          type="text"
                          value={call.url}
                          onChange={(e) => updateCall(i, "url", e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                          placeholder="https://api.smartthings.com/v1/..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Device ID</label>
                        <input
                          type="text"
                          value={call.deviceId}
                          onChange={(e) => updateCall(i, "deviceId", e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                          placeholder="uuid..."
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">지연 (초)</label>
                        <input
                          type="number"
                          min={0}
                          value={call.dsec}
                          onChange={(e) => updateCall(i, "dsec", Number(e.target.value))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? "저장 중..." : isEdit ? "수정" : "추가"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

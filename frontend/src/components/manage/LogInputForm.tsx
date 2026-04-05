"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Category } from "@/domain/types";
import { useLocations } from "@/application/useLocations";
import { useUsers } from "@/application/useUsers";
import { useCreateLifeLog } from "@/application/useMutations";
import { useAdminAuth } from "@/components/providers/AdminAuthProvider";

const EVENT_TYPES: Record<Category, { value: string; label: string }[]> = {
  location: [
    { value: "home", label: "🏠 집" },
    { value: "office", label: "🏢 회사" },
    { value: "gym", label: "💪 헬스장" },
    { value: "outside", label: "🚶 외출" },
  ],
  context: [
    { value: "sleep", label: "😴 수면" },
    { value: "meal", label: "🍚 식사" },
    { value: "cooking", label: "🍳 요리" },
    { value: "shower", label: "🚿 샤워" },
    { value: "work", label: "💼 업무" },
    { value: "exercise", label: "🏃 운동" },
    { value: "rest", label: "🛋 휴식" },
    { value: "video", label: "🎬 영상 시청" },
    { value: "music", label: "🎵 음악 시청" },
    { value: "pet_walk", label: "🐾 펫 산책" },
  ],
  event: [
    { value: "fridge", label: "🧊 냉장고" },
    { value: "microwave", label: "📡 전자레인지" },
    { value: "washing_machine", label: "🫧 세탁기" },
    { value: "door", label: "🚪 현관문" },
    { value: "light", label: "💡 조명" },
    { value: "tv_on", label: "📺 TV 켬" },
    { value: "tv_off", label: "📺 TV 끔" },
    { value: "ac_on", label: "❄️ 에어컨 켬" },
    { value: "ac_off", label: "❄️ 에어컨 끔" },
  ],
  activity: [
    { value: "sleep", label: "😴 수면" },
    { value: "meal", label: "🍚 식사" },
    { value: "shower", label: "🚿 샤워" },
    { value: "tv", label: "📺 TV" },
    { value: "washing_machine", label: "🫧 세탁기" },
    { value: "fridge", label: "🧊 냉장고" },
    { value: "microwave", label: "📡 전자레인지" },
  ],
  api_request: [
    { value: "GET", label: "GET" },
    { value: "POST", label: "POST" },
    { value: "PUT", label: "PUT" },
    { value: "PATCH", label: "PATCH" },
    { value: "DELETE", label: "DELETE" },
  ],
};

const CATEGORY_LABELS: Record<Category, string> = {
  location:    "📍 위치 이동",
  context:     "🌀 컨텍스트",
  event:       "⚡ 이벤트",
  activity:    "🔧 활동 (레거시)",
  api_request: "🔌 API 요청",
};

const toLocalDatetimeValue = (d: Date) =>
  format(d, "yyyy-MM-dd'T'HH:mm");

interface Props {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function LogInputForm({ onSuccess, onError }: Props) {
  const { isAdmin } = useAdminAuth();
  const now = toLocalDatetimeValue(new Date());

  const [locationId, setLocationId] = useState("");
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState<Category>("location");
  const [eventType, setEventType] = useState("");
  const [customEventType, setCustomEventType] = useState("");
  const [startedAt, setStartedAt] = useState(now);
  const [hasEndTime, setHasEndTime] = useState(false);
  const [endedAt, setEndedAt] = useState(now);
  // Extra data fields (for api_request: endpoint+status; for activity: custom)
  const [dataEndpoint, setDataEndpoint] = useState("");
  const [dataStatus, setDataStatus] = useState("200");
  const [dataAction, setDataAction] = useState("");

  const { data: locations } = useLocations();
  const { data: users } = useUsers(locationId || undefined);
  const mutation = useCreateLifeLog();

  const resolvedEventType = eventType === "__custom" ? customEventType : eventType;

  const buildData = (): Record<string, unknown> => {
    if (category === "api_request") {
      const d: Record<string, unknown> = {};
      if (dataEndpoint) d.endpoint = dataEndpoint;
      if (dataStatus) d.status = parseInt(dataStatus, 10);
      return d;
    }
    if (category === "activity" && dataAction) {
      return { action: dataAction };
    }
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!userId || !locationId || !resolvedEventType) {
      onError("사용자, 위치, 이벤트 종류를 모두 선택해주세요.");
      return;
    }
    try {
      await mutation.mutateAsync({
        user_id: userId,
        location_id: locationId,
        category,
        event_type: resolvedEventType,
        started_at: new Date(startedAt).toISOString(),
        ended_at: hasEndTime ? new Date(endedAt).toISOString() : null,
        data: buildData(),
      });
      onSuccess(`${resolvedEventType} 이벤트가 기록됐습니다.`);
      // Reset transient fields
      setEventType("");
      setCustomEventType("");
      setDataEndpoint("");
      setDataAction("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "입력 실패");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isAdmin && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          관리자 로그인 후 이벤트를 기록할 수 있습니다.
        </p>
      )}
      <fieldset disabled={!isAdmin} className="min-w-0 space-y-5 border-0 p-0 disabled:opacity-60">
      {/* Location + User */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">위치</label>
          <select
            value={locationId}
            onChange={(e) => { setLocationId(e.target.value); setUserId(""); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="">위치 선택...</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">사용자</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            disabled={!locationId}
          >
            <option value="">사용자 선택...</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
        <div className="flex gap-2">
          {(["location", "context", "event", "api_request"] as Category[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setCategory(cat); setEventType(""); setHasEndTime(cat === "context"); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition ${
                category === cat
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">이벤트 종류</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES[category].map((ev) => (
            <button
              key={ev.value}
              type="button"
              onClick={() => setEventType(ev.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                eventType === ev.value
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {ev.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEventType("__custom")}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              eventType === "__custom"
                ? "bg-gray-700 border-gray-700 text-white"
                : "border-dashed border-gray-300 text-gray-400 hover:bg-gray-50"
            }`}
          >
            + 직접 입력
          </button>
        </div>
        {eventType === "__custom" && (
          <input
            type="text"
            placeholder="이벤트 이름 입력"
            value={customEventType}
            onChange={(e) => setCustomEventType(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>

      {/* Time */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="has-end"
            type="checkbox"
            checked={hasEndTime}
            onChange={(e) => setHasEndTime(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
          />
          <label htmlFor="has-end" className="text-sm text-gray-600">종료 시간 있음 (지속 이벤트)</label>
        </div>
        {hasEndTime && (
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>

      {/* Extra data for specific categories */}
      {category === "api_request" && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">엔드포인트 (선택)</label>
            <input
              type="text"
              placeholder="/api/v1/life-logs"
              value={dataEndpoint}
              onChange={(e) => setDataEndpoint(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">HTTP 상태 코드</label>
            <input
              type="number"
              value={dataStatus}
              onChange={(e) => setDataStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}
      {category === "activity" && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="block text-xs font-medium text-gray-500 mb-1">동작 (선택, 예: open/close)</label>
          <input
            type="text"
            placeholder="open"
            value={dataAction}
            onChange={(e) => setDataAction(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || !isAdmin}
        className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {mutation.isPending ? "저장 중..." : "이벤트 기록"}
      </button>
      </fieldset>
    </form>
  );
}

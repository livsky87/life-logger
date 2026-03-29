"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useLocations } from "@/application/useLocations";
import { useUsers } from "@/application/useUsers";
import { useLogs } from "@/application/useLogs";
import { useDeleteLifeLog, useEndLifeLog } from "@/application/useMutations";
import { getEventStyle } from "@/components/timeline/eventConfig";
import type { Category, LifeLog } from "@/domain/types";

const CATEGORY_LABELS: Record<Category, string> = {
  location: "위치",
  activity: "활동",
  api_request: "API",
};

const CATEGORY_COLORS: Record<Category, string> = {
  location: "bg-blue-100 text-blue-700",
  activity: "bg-purple-100 text-purple-700",
  api_request: "bg-emerald-100 text-emerald-700",
};

interface Props {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function LogManager({ onSuccess, onError }: Props) {
  const [filterLocId, setFilterLocId] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [limit, setLimit] = useState(20);
  // End-event modal state
  const [endingLog, setEndingLog] = useState<LifeLog | null>(null);
  const [endedAt, setEndedAt] = useState("");

  const { data: locations } = useLocations();
  const { data: users } = useUsers(filterLocId || undefined);
  const { data: logs, isLoading } = useLogs({
    location_id: filterLocId || undefined,
    user_id: filterUserId || undefined,
    category: filterCategory || undefined,
    limit,
  });

  const deleteLog = useDeleteLifeLog();
  const endLog = useEndLifeLog();

  const handleDelete = async (log: LifeLog) => {
    if (!confirm(`로그 #${log.id} (${log.event_type})를 삭제할까요?`)) return;
    try {
      await deleteLog.mutateAsync(log.id);
      onSuccess(`로그 #${log.id} 삭제됐습니다.`);
    } catch {
      onError("삭제 실패");
    }
  };

  const handleEndConfirm = async () => {
    if (!endingLog || !endedAt) return;
    try {
      await endLog.mutateAsync({ logId: endingLog.id, endedAt: new Date(endedAt).toISOString() });
      onSuccess(`로그 #${endingLog.id} 종료 시간이 저장됐습니다.`);
      setEndingLog(null);
    } catch {
      onError("종료 실패");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">위치</label>
          <select
            value={filterLocId}
            onChange={(e) => { setFilterLocId(e.target.value); setFilterUserId(""); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 위치</option>
            {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">사용자</label>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 사용자</option>
            {users?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체</option>
            <option value="location">위치</option>
            <option value="activity">활동</option>
            <option value="api_request">API 요청</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">표시 개수</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}개</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-500 self-end pb-2">
          {logs?.length ?? 0}개 표시
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : !logs?.length ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          조건에 맞는 로그가 없습니다
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">카테고리</th>
                <th className="px-4 py-3">이벤트</th>
                <th className="px-4 py-3">시작</th>
                <th className="px-4 py-3">종료</th>
                <th className="px-4 py-3">데이터</th>
                <th className="px-4 py-3 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const style = getEventStyle(log.category as Category, log.event_type);
                const isOpen = !log.ended_at;
                const dataStr = Object.entries(log.data)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ");
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-400 font-mono">#{log.id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[log.category as Category]}`}>
                        {CATEGORY_LABELS[log.category as Category]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${style.color} ${style.textColor}`}>
                        {style.label || log.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                      {format(new Date(log.started_at), "MM/dd HH:mm")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      {log.ended_at ? (
                        <span className="text-gray-600">{format(new Date(log.ended_at), "MM/dd HH:mm")}</span>
                      ) : (
                        <span className="text-amber-500 font-semibold">진행 중</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-32 truncate">{dataStr || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {isOpen && (
                          <button
                            onClick={() => {
                              setEndingLog(log);
                              setEndedAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition font-medium"
                          >
                            종료
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(log)}
                          disabled={deleteLog.isPending}
                          className="px-2.5 py-1 text-xs rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition font-medium disabled:opacity-50"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* End event modal */}
      {endingLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <h3 className="font-semibold text-gray-900 mb-1">이벤트 종료</h3>
            <p className="text-sm text-gray-500 mb-4">
              로그 #{endingLog.id} · <strong>{endingLog.event_type}</strong> 이벤트의 종료 시간을 설정합니다.
            </p>
            <input
              type="datetime-local"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEndingLog(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={handleEndConfirm}
                disabled={endLog.isPending}
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {endLog.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

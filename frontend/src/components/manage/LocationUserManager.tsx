"use client";

import { useState } from "react";
import { useLocations } from "@/application/useLocations";
import { useUsers } from "@/application/useUsers";
import { useCreateLocation, useCreateUser } from "@/application/useMutations";

const TIMEZONES = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
];

interface Props {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function LocationUserManager({ onSuccess, onError }: Props) {
  const { data: locations } = useLocations();

  // Location form
  const [locCode, setLocCode] = useState("");
  const [locName, setLocName] = useState("");
  const [locTz, setLocTz] = useState("Asia/Seoul");
  const [locDesc, setLocDesc] = useState("");
  const createLoc = useCreateLocation();

  // User form
  const [filterLocId, setFilterLocId] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userJob, setUserJob] = useState("");
  const [userLocId, setUserLocId] = useState("");
  const createUser = useCreateUser();

  const { data: users } = useUsers(filterLocId || undefined);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) return;
    try {
      await createLoc.mutateAsync({ location_code: locCode || undefined, name: locName, timezone: locTz, description: locDesc || undefined });
      onSuccess(`"${locName}" 위치가 추가됐습니다.`);
      setLocCode(""); setLocName(""); setLocDesc("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "위치 추가 실패");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userLocId) return;
    try {
      await createUser.mutateAsync({ name: userName, location_id: userLocId, email: userEmail || undefined, job: userJob || undefined });
      onSuccess(`"${userName}" 사용자가 추가됐습니다.`);
      setUserName(""); setUserEmail(""); setUserJob("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "사용자 추가 실패");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ── 위치 관리 ── */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 text-base">위치 목록</h3>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {!locations?.length && (
            <p className="text-sm text-gray-400 py-4 text-center">등록된 위치가 없습니다</p>
          )}
          {locations?.map((l) => (
            <div key={l.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                {l.location_code && (
                  <span className="mr-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs font-mono">{l.location_code}</span>
                )}
                <span className="text-sm font-medium">{l.name}</span>
                {l.description && (
                  <span className="ml-2 text-xs text-gray-400">{l.description}</span>
                )}
              </div>
              <span className="text-xs text-gray-400">{l.timezone}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateLocation} className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-600">위치 추가</h4>
          <input
            type="text"
            placeholder="위치 코드 (선택, 예: home-seoul)"
            value={locCode}
            onChange={(e) => setLocCode(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
          <input
            type="text"
            placeholder="위치 이름 (예: 우리집)"
            value={locName}
            onChange={(e) => setLocName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <input
            type="text"
            placeholder="설명 (선택)"
            value={locDesc}
            onChange={(e) => setLocDesc(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={locTz}
            onChange={(e) => setLocTz(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createLoc.isPending}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {createLoc.isPending ? "추가 중..." : "위치 추가"}
          </button>
        </form>
      </div>

      {/* ── 사용자 관리 ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-base">사용자 목록</h3>
          <select
            value={filterLocId}
            onChange={(e) => setFilterLocId(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 위치</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {!users?.length && (
            <p className="text-sm text-gray-400 py-4 text-center">등록된 사용자가 없습니다</p>
          )}
          {users?.map((u) => {
            const loc = locations?.find((l) => l.id === u.location_id);
            return (
              <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                    {u.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{u.name}</span>
                      {u.job && <span className="text-xs text-gray-500">{u.job}</span>}
                    </div>
                    {u.email && <div className="text-xs text-gray-400">{u.email}</div>}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{loc?.name ?? "—"}</span>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleCreateUser} className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-600">사용자 추가</h4>
          <select
            value={userLocId}
            onChange={(e) => setUserLocId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="">위치 선택...</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="이름"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <input
            type="email"
            placeholder="이메일 (선택)"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="직업 (선택, 예: 개발자)"
            value={userJob}
            onChange={(e) => setUserJob(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={createUser.isPending}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {createUser.isPending ? "추가 중..." : "사용자 추가"}
          </button>
        </form>
      </div>
    </div>
  );
}

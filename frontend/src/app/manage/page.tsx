"use client";

import { useState, useCallback } from "react";
import { LocationUserManager } from "@/components/manage/LocationUserManager";
import { LogManager } from "@/components/manage/LogManager";
import { ScheduleLog } from "@/components/manage/ScheduleLog";
import { SimulationView } from "@/components/manage/SimulationView";
import { Toast, type ToastType } from "@/components/ui/Toast";

type Tab = "schedule" | "simulation" | "settings" | "logs";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "schedule",   label: "스케줄",          icon: "🗓️" },
  { id: "simulation", label: "시뮬레이션",        icon: "🏠" },
  { id: "settings",  label: "위치·사용자 관리",   icon: "⚙️" },
  { id: "logs",      label: "로그 목록",          icon: "📋" },
];

export default function ManagePage() {
  const [tab, setTab] = useState<Tab>("schedule");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showSuccess = useCallback((msg: string) => setToast({ message: msg, type: "success" }), []);
  const showError = useCallback((msg: string) => setToast({ message: msg, type: "error" }), []);

  const isWide = tab === "simulation";

  return (
    <div className={`${isWide ? "max-w-full" : "max-w-4xl"} mx-auto p-6`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">라이프로그 관리</h1>
        <p className="text-gray-500 text-sm mt-1">스케줄과 시뮬레이션을 관리합니다</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={`bg-white rounded-2xl border border-gray-200 ${tab === "simulation" ? "overflow-hidden" : "p-6"}`}>
        {tab === "schedule" && (
          <ScheduleLog onSuccess={showSuccess} onError={showError} />
        )}
        {tab === "simulation" && (
          <SimulationView onSuccess={showSuccess} onError={showError} />
        )}
        {tab === "settings" && (
          <>
            <h2 className="font-semibold text-gray-800 mb-4">위치 및 사용자 관리</h2>
            <LocationUserManager onSuccess={showSuccess} onError={showError} />
          </>
        )}
        {tab === "logs" && (
          <>
            <h2 className="font-semibold text-gray-800 mb-4">로그 목록</h2>
            <LogManager onSuccess={showSuccess} onError={showError} />
          </>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

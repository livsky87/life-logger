"use client";

import { useCallback, useState } from "react";
import { LogManager } from "@/components/manage/LogManager";
import { Toast, type ToastType } from "@/components/ui/Toast";

export default function LogsPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showSuccess = useCallback((msg: string) => setToast({ message: msg, type: "success" }), []);
  const showError = useCallback((msg: string) => setToast({ message: msg, type: "error" }), []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">로그 목록</h1>
        <p className="text-gray-500 text-sm mt-1">라이프로그 이벤트를 조회합니다</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <LogManager onSuccess={showSuccess} onError={showError} />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

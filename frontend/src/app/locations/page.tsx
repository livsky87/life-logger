"use client";

import { useCallback, useState } from "react";
import { LocationUserManager } from "@/components/manage/LocationUserManager";
import { Toast, type ToastType } from "@/components/ui/Toast";

export default function LocationsPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showSuccess = useCallback((msg: string) => setToast({ message: msg, type: "success" }), []);
  const showError = useCallback((msg: string) => setToast({ message: msg, type: "error" }), []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">위치·사용자 관리</h1>
        <p className="text-gray-500 text-sm mt-1">위치와 사용자를 관리합니다</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <LocationUserManager onSuccess={showSuccess} onError={showError} />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

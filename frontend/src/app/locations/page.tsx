"use client";

import { useCallback, useState } from "react";
import { LocationUserManager } from "@/components/manage/LocationUserManager";
import { Toast, type ToastType } from "@/components/ui/Toast";

export default function LocationsPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showSuccess = useCallback((msg: string) => setToast({ message: msg, type: "success" }), []);
  const showError = useCallback((msg: string) => setToast({ message: msg, type: "error" }), []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">위치·사용자 관리</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">위치와 사용자를 관리합니다</p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
        <LocationUserManager onSuccess={showSuccess} onError={showError} />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

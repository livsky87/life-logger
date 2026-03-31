"use client";

import { useCallback, useState } from "react";
import { SimulationView } from "@/components/manage/SimulationView";
import { Toast, type ToastType } from "@/components/ui/Toast";

export default function SimulationPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showSuccess = useCallback((msg: string) => setToast({ message: msg, type: "success" }), []);
  const showError = useCallback((msg: string) => setToast({ message: msg, type: "error" }), []);

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      <SimulationView onSuccess={showSuccess} onError={showError} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

"use client";

import { useAdminAuth } from "@/components/providers/AdminAuthProvider";

export function AdminReadOnlyBanner() {
  const { isAdmin, openLoginModal } = useAdminAuth();

  if (isAdmin) return null;

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-2 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100/95">
      <span>현재 <strong className="font-semibold">조회 전용</strong>입니다. 수정·삭제·추가는 관리자 로그인 후 이용할 수 있습니다.</span>
      <button
        type="button"
        onClick={openLoginModal}
        className="rounded-md bg-amber-600/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        관리자 로그인
      </button>
    </div>
  );
}

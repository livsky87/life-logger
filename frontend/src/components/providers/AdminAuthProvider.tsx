"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Shield, X } from "lucide-react";
import {
  clearAdminSession,
  getAdminSessionToken,
  isAdminTokenHintConfigured,
  tryAdminLogin,
} from "@/lib/adminSession";

type AdminAuthContextValue = {
  isAdmin: boolean;
  login: (phrase: string) => boolean;
  logout: () => void;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function AdminLoginModal({
  open,
  onClose,
  onLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  onLoggedIn: () => void;
}) {
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPhrase("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phrase.trim()) {
      setError("토큰을 입력하세요.");
      return;
    }
    if (tryAdminLogin(phrase)) {
      onLoggedIn();
      onClose();
      setPhrase("");
      setError(null);
      return;
    }
    setError(
      isAdminTokenHintConfigured()
        ? "토큰이 올바르지 않습니다."
        : "세션에 저장하지 못했습니다. 브라우저 설정을 확인하세요.",
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">
      <div
        className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal
        aria-labelledby="admin-login-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 id="admin-login-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              관리자 로그인
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              수정·삭제 등 변경 작업에 필요합니다. 토큰은{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-[10px] dark:bg-zinc-800">API_ADMIN_TOKEN</code>
              과 동일해야 합니다.
            </p>
            {!isAdminTokenHintConfigured() && (
              <p className="mt-1 text-[10px] leading-snug text-amber-700 dark:text-amber-400/90">
                <code className="font-mono">NEXT_PUBLIC_API_ADMIN_TOKEN</code>이 비어 있으면 서버에 설정한 비밀 토큰을
                직접 입력하면 됩니다(클라이언트 번들에 힌트가 없음).
              </p>
            )}
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="admin-token" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              관리자 토큰
            </label>
            <input
              id="admin-token"
              type="password"
              autoComplete="current-password"
              value={phrase}
              onChange={(e) => {
                setPhrase(e.target.value);
                setError(null);
              }}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="토큰 입력"
            />
            {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    setIsAdmin(!!getAdminSessionToken());
  }, []);

  const login = useCallback((phrase: string) => {
    if (tryAdminLogin(phrase)) {
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();
    setIsAdmin(false);
  }, []);

  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  const value = useMemo(
    () => ({
      isAdmin,
      login,
      logout,
      loginModalOpen,
      openLoginModal,
      closeLoginModal,
    }),
    [isAdmin, login, logout, loginModalOpen, openLoginModal, closeLoginModal],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
      <AdminLoginModal
        open={loginModalOpen}
        onClose={closeLoginModal}
        onLoggedIn={() => setIsAdmin(true)}
      />
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth는 AdminAuthProvider 안에서만 사용하세요.");
  }
  return ctx;
}

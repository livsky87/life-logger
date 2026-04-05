/** 브라우저 세션에만 보관. 로그인 성공 시 저장되는 값이 API Bearer 토큰과 동일해야 함. */

const STORAGE_KEY = "life-logger-admin-bearer";

export function getExpectedAdminSecret(): string {
  const fromEnv =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_ADMIN_TOKEN?.trim() : "";
  return fromEnv || "hde-system";
}

export function getAdminSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** 입력값이 기대 토큰과 같으면 세션에 저장하고 true */
export function tryAdminLogin(phrase: string): boolean {
  const expected = getExpectedAdminSecret();
  if (phrase.trim() !== expected) return false;
  if (typeof window === "undefined") return false;
  try {
    sessionStorage.setItem(STORAGE_KEY, expected);
    return true;
  } catch {
    return false;
  }
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

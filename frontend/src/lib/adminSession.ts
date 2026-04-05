/** 브라우저 세션에만 보관. 저장값은 API Bearer 토큰과 백엔드 API_ADMIN_TOKEN 과 일치해야 합니다. */

const STORAGE_KEY = "life-logger-admin-bearer";

/** 빌드/런타임에 설정된 힌트(선택). 있으면 로그인 시 입력값이 이와 일치해야 저장됩니다. 없으면 입력값을 그대로 저장하고 서버가 검증합니다. */
export function getExpectedAdminSecret(): string {
  if (typeof process === "undefined") return "";
  return process.env.NEXT_PUBLIC_API_ADMIN_TOKEN?.trim() ?? "";
}

export function isAdminTokenHintConfigured(): boolean {
  return getExpectedAdminSecret().length > 0;
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

/** NEXT_PUBLIC_API_ADMIN_TOKEN 이 있으면 입력이 그 값과 같을 때만 저장. 없으면 비어 있지 않은 입력을 저장(서버 Bearer 검증). */
export function tryAdminLogin(phrase: string): boolean {
  const t = phrase.trim();
  if (!t) return false;
  const expected = getExpectedAdminSecret();
  if (expected.length > 0 && t !== expected) return false;
  if (typeof window === "undefined") return false;
  try {
    sessionStorage.setItem(STORAGE_KEY, t);
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

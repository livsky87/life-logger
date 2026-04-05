import { getAdminSessionToken } from "@/lib/adminSession";

// In browser: use relative path (goes through Next.js rewrites → backend)
// In server components / SSR: call backend directly via env var
const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser → relative
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function buildHeaders(init?: RequestInit): Headers {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAdminSessionToken();
  if (token && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: buildHeaders(init),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

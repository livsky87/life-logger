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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

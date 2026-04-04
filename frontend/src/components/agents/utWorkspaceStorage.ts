const LS_KEY = "life-logger:openclaw-workspace-root-by-key";
const LEGACY_LS_KEY = "life-logger:ut-workspace-root-by-slot";

function migrateLegacyIfNeeded(): void {
  try {
    if (localStorage.getItem(LS_KEY)) return;
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return;
    const o = JSON.parse(raw) as Record<string, string>;
    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) {
      const slot = parseInt(k, 10);
      if (!Number.isFinite(slot) || slot < 1) continue;
      mapped[`workspace-ut-bot-${String(slot).padStart(3, "0")}`] = v;
    }
    if (Object.keys(mapped).length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(mapped));
    }
  } catch {
    /* ignore */
  }
}

export function readWorkspaceRootOverride(workspaceKey: string): string | null {
  if (typeof window === "undefined") return null;
  migrateLegacyIfNeeded();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, string>;
    const v = o[workspaceKey];
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

export function writeWorkspaceRootOverride(workspaceKey: string, absolutePath: string | null): void {
  migrateLegacyIfNeeded();
  try {
    const raw = localStorage.getItem(LS_KEY);
    let o: Record<string, string> = {};
    if (raw) {
      const p = JSON.parse(raw) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) o = p as Record<string, string>;
    }
    if (absolutePath && absolutePath.trim()) {
      o[workspaceKey] = absolutePath.trim();
    } else {
      delete o[workspaceKey];
    }
    localStorage.setItem(LS_KEY, JSON.stringify(o));
  } catch {
    /* ignore */
  }
}

import fs from "fs/promises";
import path from "path";
import os from "os";

/** 셸의 $HOME과 맞추기 위해 환경 변수를 우선합니다(Next dev 프로세스의 homedir 불일치 완화). */
export function userHome(): string {
  if (process.platform === "win32") {
    const u = process.env.USERPROFILE?.trim();
    if (u) return path.resolve(u);
  } else {
    const h = process.env.HOME?.trim();
    if (h) return path.resolve(h);
  }
  return os.homedir();
}

/**
 * OPENCLAW_HOME: `.openclaw` 디렉터리 전체 경로(또는 `~/...` 형태).
 * 미설정 시 `path.join(userHome(), ".openclaw")`.
 */
export function getOpenclawBase(): string {
  const env = process.env.OPENCLAW_HOME?.trim();
  if (env) {
    const expanded = env.replace(/^~(?=\/|\\|$)/, userHome());
    return path.resolve(expanded);
  }
  return path.join(userHome(), ".openclaw");
}

const MAX_ROOT_PARAM_LEN = 4096;

/** OpenClaw 하위 워크스페이스 폴더 이름 (경로 조각만 허용). */
const WORKSPACE_KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/;

export function assertValidWorkspaceKey(workspaceKey: string): void {
  if (!WORKSPACE_KEY_RE.test(workspaceKey)) {
    throw new Error("유효하지 않은 워크스페이스 이름입니다.");
  }
}

function defaultPathUnderOpenclaw(workspaceKey: string): string {
  assertValidWorkspaceKey(workspaceKey);
  const base = path.resolve(getOpenclawBase());
  const resolved = path.resolve(path.join(base, workspaceKey));
  const rel = path.relative(base, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("유효하지 않은 워크스페이스 이름입니다.");
  }
  return resolved;
}

/**
 * `rootParam`이 비어 있으면 `OPENCLAW_HOME/workspaceKey`, 있으면 사용자 지정 절대 경로.
 */
export async function resolveWorkspaceRootFromKey(
  workspaceKey: string,
  rootParam: string | null,
): Promise<{ root: string; isCustom: boolean; defaultWorkspacePath: string }> {
  const defaultWorkspacePath = defaultPathUnderOpenclaw(workspaceKey);
  if (rootParam == null) {
    return { root: defaultWorkspacePath, isCustom: false, defaultWorkspacePath };
  }
  const trimmed = rootParam.trim();
  if (trimmed.length === 0) {
    return { root: defaultWorkspacePath, isCustom: false, defaultWorkspacePath };
  }
  if (trimmed.length > MAX_ROOT_PARAM_LEN) {
    throw new Error("경로가 너무 깁니다.");
  }
  const expanded = trimmed.replace(/^~(?=\/|\\|$)/, userHome());
  const resolved = path.resolve(expanded);
  if (!path.isAbsolute(resolved)) {
    throw new Error("절대 경로를 입력해 주세요.");
  }
  let st;
  try {
    st = await fs.stat(resolved);
  } catch {
    throw new Error("폴더를 찾을 수 없거나 읽을 수 없습니다.");
  }
  if (!st.isDirectory()) {
    throw new Error("디렉터리가 아닙니다.");
  }
  return { root: resolved, isCustom: true, defaultWorkspacePath };
}

const SKIP_DIR_NAMES = new Set(["node_modules", ".git"]);

export async function collectMarkdownFiles(absDir: string, root: string): Promise<{ relativePath: string; name: string }[]> {
  const out: { relativePath: string; name: string }[] = [];

  async function walk(d: string, isRoot: boolean): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch (err) {
      if (isRoot) throw err;
      return;
    }

    for (const e of entries) {
      if (SKIP_DIR_NAMES.has(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        await walk(full, false);
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
        const rel = path.relative(root, full);
        out.push({ relativePath: rel.split(path.sep).join("/"), name: e.name });
      }
    }
  }

  await walk(absDir, true);
  out.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
  return out;
}

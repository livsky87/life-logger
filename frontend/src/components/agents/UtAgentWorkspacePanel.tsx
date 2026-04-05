"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, FileText, FolderOpen, Loader2, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { useAdminAuth } from "@/components/providers/AdminAuthProvider";
import { readWorkspaceRootOverride, writeWorkspaceRootOverride } from "./utWorkspaceStorage";

type ListResponse = {
  ok: boolean;
  files: { relativePath: string; name: string }[];
  workspacePath: string;
  defaultWorkspacePath: string;
  workspaceKey: string;
  isCustomRoot: boolean;
  openclawBase: string;
  missing: boolean;
  listError?: string;
};

type ContentResponse = { ok: boolean; html: string; path: string };

function workspaceQueryKey(workspaceKey: string, rootOverride: string | null) {
  return ["openclaw-workspace", workspaceKey, rootOverride ?? ""] as const;
}

async function fetchFileList(workspaceKey: string, rootOverride: string | null): Promise<ListResponse> {
  const enc = encodeURIComponent(workspaceKey);
  const qs =
    rootOverride && rootOverride.trim()
      ? `?root=${encodeURIComponent(rootOverride.trim())}`
      : "";
  const res = await fetch(`/api/openclaw-workspace/${enc}${qs}`);
  const data = (await res.json()) as ListResponse & { error?: string; listError?: string };
  if (!res.ok) {
    throw new Error(data.error || data.listError || "목록을 불러오지 못했습니다.");
  }
  if (data.ok === false) {
    throw new Error(data.listError || "목록을 불러오지 못했습니다.");
  }
  return data;
}

async function fetchFileContent(
  workspaceKey: string,
  relativePath: string,
  rootOverride: string | null,
): Promise<ContentResponse> {
  const enc = encodeURIComponent(workspaceKey);
  const params = new URLSearchParams();
  params.set("path", relativePath);
  if (rootOverride?.trim()) params.set("root", rootOverride.trim());
  const res = await fetch(`/api/openclaw-workspace/${enc}/content?${params.toString()}`);
  const data = (await res.json()) as ContentResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || "파일을 읽지 못했습니다.");
  return data as ContentResponse;
}

interface Props {
  workspaceKey: string;
  nodeLabel: string;
  onClose: () => void;
}

export function UtAgentWorkspacePanel({ workspaceKey, nodeLabel, onClose }: Props) {
  const { isAdmin } = useAdminAuth();
  const [rootOverride, setRootOverride] = useState<string | null>(null);
  const [folderUiOpen, setFolderUiOpen] = useState(false);
  const [pathDraft, setPathDraft] = useState("");

  useEffect(() => {
    setRootOverride(readWorkspaceRootOverride(workspaceKey));
  }, [workspaceKey]);

  useEffect(() => {
    if (!isAdmin) setFolderUiOpen(false);
  }, [isAdmin]);

  const [activePath, setActivePath] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: workspaceQueryKey(workspaceKey, rootOverride),
    queryFn: () => fetchFileList(workspaceKey, rootOverride),
  });

  const files = listQuery.data?.files ?? [];

  useEffect(() => {
    const fs = listQuery.data?.files;
    if (!fs?.length) {
      setActivePath(null);
      return;
    }
    setActivePath((cur) => (cur && fs.some((f) => f.relativePath === cur) ? cur : fs[0].relativePath));
  }, [listQuery.data]);

  const contentQuery = useQuery({
    queryKey: ["openclaw-workspace-content", workspaceKey, activePath, rootOverride ?? ""],
    queryFn: () => fetchFileContent(workspaceKey, activePath!, rootOverride),
    enabled: !!activePath && listQuery.isSuccess,
    retry: false,
  });

  const openFolderEditor = useCallback(() => {
    setPathDraft(
      rootOverride ||
        listQuery.data?.workspacePath ||
        listQuery.data?.defaultWorkspacePath ||
        "",
    );
    setFolderUiOpen(true);
  }, [rootOverride, listQuery.data?.defaultWorkspacePath, listQuery.data?.workspacePath]);

  const applyFolder = useCallback(() => {
    if (!isAdmin) return;
    const t = pathDraft.trim();
    if (t.length === 0) {
      writeWorkspaceRootOverride(workspaceKey, null);
      setRootOverride(null);
    } else {
      writeWorkspaceRootOverride(workspaceKey, t);
      setRootOverride(t);
    }
    setFolderUiOpen(false);
    setActivePath(null);
  }, [pathDraft, workspaceKey, isAdmin]);

  const resetToDefault = useCallback(() => {
    if (!isAdmin) return;
    writeWorkspaceRootOverride(workspaceKey, null);
    setRootOverride(null);
    setFolderUiOpen(false);
    setActivePath(null);
  }, [workspaceKey, isAdmin]);

  const keyDisplay = listQuery.data?.workspaceKey ?? workspaceKey;
  const resolvedPath = listQuery.data?.workspacePath;
  const resolvedBase = listQuery.data?.openclawBase;
  const defaultPath = listQuery.data?.defaultWorkspacePath;
  const isCustom = listQuery.data?.isCustomRoot;

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-xl border border-zinc-700/90 bg-zinc-950 shadow-lg">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-zinc-800 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">워크스페이스</p>
          <p className="truncate text-sm font-semibold text-zinc-100">{nodeLabel}</p>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-600">폴더: {keyDisplay}</p>
          <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-zinc-500">
            <FolderOpen className="h-3 w-3 shrink-0" />
            <span className="min-w-0 break-all" title={resolvedPath}>
              {resolvedPath ?? `~/.openclaw/${keyDisplay}`}
            </span>
          </p>
          {isCustom && (
            <p className="mt-1 text-[9px] font-medium text-amber-400/90">사용자 지정 폴더</p>
          )}
          {resolvedBase && resolvedBase !== resolvedPath && !isCustom && (
            <p className="mt-0.5 break-all font-mono text-[9px] text-zinc-600" title={resolvedBase}>
              OpenClaw: {resolvedBase}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          닫기
        </button>
      </div>

      <div className="shrink-0 border-b border-zinc-800 px-2 py-1.5">
        <button
          type="button"
          disabled={!isAdmin}
          title={!isAdmin ? "관리자 로그인 후 폴더를 바꿀 수 있습니다" : undefined}
          onClick={() => {
            if (!isAdmin) return;
            folderUiOpen ? setFolderUiOpen(false) : openFolderEditor();
          }}
          className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {folderUiOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          폴더 선택 (기본: ~/.openclaw/{keyDisplay})
        </button>
        {folderUiOpen && isAdmin && (
          <div className="mt-2 space-y-2 px-0.5 pb-1">
            <p className="text-[10px] leading-snug text-zinc-500">
              절대 경로를 입력하세요. <code className="text-zinc-400">~</code> 로 홈을 쓸 수 있습니다. 이 브라우저에만
              저장됩니다.
            </p>
            {defaultPath && (
              <p className="break-all font-mono text-[9px] text-zinc-600" title={defaultPath}>
                기본 경로: {defaultPath}
              </p>
            )}
            <input
              type="text"
              value={pathDraft}
              onChange={(e) => setPathDraft(e.target.value)}
              placeholder="/path/to/folder"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-600/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              spellCheck={false}
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={applyFolder}
                className="inline-flex items-center gap-1 rounded-md bg-cyan-600/25 px-2 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-600/35"
              >
                <Check className="h-3 w-3" />
                이 경로 적용
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-600/80 px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <RotateCcw className="h-3 w-3" />
                기본 폴더로
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="flex max-h-40 shrink-0 flex-col border-b border-zinc-800 md:max-h-none md:w-[38%] md:border-b-0 md:border-r">
          <p className="shrink-0 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Markdown 파일
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
            {listQuery.isLoading && (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                불러오는 중…
              </div>
            )}
            {listQuery.isError && (
              <p className="px-2 py-2 text-xs text-red-400/90">{(listQuery.error as Error).message}</p>
            )}
            {listQuery.isSuccess && listQuery.data.missing && (
              <p className="px-2 py-2 text-xs leading-relaxed text-zinc-500">
                {listQuery.data.isCustomRoot ? (
                  <>선택한 경로에 폴더가 없거나 디렉터리가 아닙니다. 경로를 확인해 주세요.</>
                ) : (
                  <>
                    기본 폴더가 없습니다. 로컬에{" "}
                    <code className="text-zinc-400">~/.openclaw/{keyDisplay}</code> 를 만들거나, 위에서 다른 폴더를
                    지정하세요.
                  </>
                )}
              </p>
            )}
            {listQuery.isSuccess && !listQuery.data.missing && files.length === 0 && (
              <p className="px-2 py-2 text-xs text-zinc-500">이 폴더에 .md 파일이 없습니다.</p>
            )}
            {files.map((f) => (
              <button
                key={f.relativePath}
                type="button"
                onClick={() => setActivePath(f.relativePath)}
                className={clsx(
                  "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors",
                  activePath === f.relativePath
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200",
                )}
              >
                <FileText className="h-3 w-3 shrink-0 opacity-70" />
                <span className="min-w-0 truncate" title={f.relativePath}>
                  {f.relativePath}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 md:min-h-[200px]">
          {!activePath && listQuery.isSuccess && files.length === 0 && (
            <p className="text-xs text-zinc-500">표시할 문서가 없습니다.</p>
          )}
          {activePath && contentQuery.isLoading && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              문서 로딩…
            </div>
          )}
          {contentQuery.isError && (
            <p className="text-xs text-red-400/90">{(contentQuery.error as Error).message}</p>
          )}
          {contentQuery.isSuccess && (
            <article
              className="ut-workspace-html text-sm"
              dangerouslySetInnerHTML={{ __html: contentQuery.data.html }}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  collectMarkdownFiles,
  getOpenclawBase,
  resolveWorkspaceRootFromKey,
} from "@/lib/openclawPaths";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { workspaceKey: string } }) {
  const workspaceKey = params.workspaceKey;
  const rootParam = new URL(request.url).searchParams.get("root");
  let root: string;
  let isCustom: boolean;
  let defaultWorkspacePath: string;
  try {
    const r = await resolveWorkspaceRootFromKey(workspaceKey, rootParam);
    root = r.root;
    isCustom = r.isCustom;
    defaultWorkspacePath = r.defaultWorkspacePath;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const openclawBase = getOpenclawBase();
  let missing = false;
  try {
    const st = await fs.stat(root);
    if (!st.isDirectory()) missing = true;
  } catch {
    missing = true;
  }

  if (missing) {
    return NextResponse.json({
      ok: true,
      files: [] as { relativePath: string; name: string }[],
      workspacePath: root,
      defaultWorkspacePath,
      workspaceKey,
      isCustomRoot: isCustom,
      openclawBase,
      missing: true,
    });
  }

  try {
    const files = await collectMarkdownFiles(root, root);
    return NextResponse.json({
      ok: true,
      files,
      workspacePath: root,
      defaultWorkspacePath,
      workspaceKey,
      isCustomRoot: isCustom,
      openclawBase,
      missing: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        files: [] as { relativePath: string; name: string }[],
        workspacePath: root,
        defaultWorkspacePath,
        workspaceKey,
        isCustomRoot: isCustom,
        openclawBase,
        missing: false,
        listError: message,
      },
      { status: 500 },
    );
  }
}

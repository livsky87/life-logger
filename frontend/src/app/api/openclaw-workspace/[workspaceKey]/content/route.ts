import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { marked } from "marked";
import { resolveWorkspaceRootFromKey } from "@/lib/openclawPaths";

marked.setOptions({
  gfm: true,
  breaks: false,
});

export const dynamic = "force-dynamic";

function safeFileUnderRoot(root: string, rel: string): string | null {
  if (!rel || rel.includes("\0")) return null;
  const rootResolved = path.resolve(root);
  const joined = path.resolve(path.join(rootResolved, rel));
  const relFrom = path.relative(rootResolved, joined);
  if (relFrom.startsWith("..") || path.isAbsolute(relFrom)) return null;
  if (!joined.toLowerCase().endsWith(".md")) return null;
  return joined;
}

function normalizeRelativePathParam(raw: string | null): string {
  if (raw == null || raw === "") return "";
  let s = raw.replace(/\\/g, "/").trim();
  while (s.startsWith("/")) s = s.slice(1);
  return s;
}

export async function GET(request: Request, { params }: { params: { workspaceKey: string } }) {
  const workspaceKey = params.workspaceKey;
  const url = new URL(request.url);
  const rel = normalizeRelativePathParam(url.searchParams.get("path"));
  const rootParam = url.searchParams.get("root");
  let root: string;
  try {
    const r = await resolveWorkspaceRootFromKey(workspaceKey, rootParam);
    root = r.root;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const abs = safeFileUnderRoot(root, rel);
  if (!abs) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  try {
    const content = await fs.readFile(abs, "utf8");
    const parsed = marked.parse(content);
    const html = typeof parsed === "string" ? parsed : await parsed;
    return NextResponse.json({ ok: true, html, path: rel });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

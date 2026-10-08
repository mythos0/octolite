/**
 * Raw file endpoint: /api/raw?repo=<name>&ref=<branch|sha>&path=<a/b.txt>&download=1
 */
import { NextRequest, NextResponse } from "next/server";
import { readFileContent } from "@/lib/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  bmp: "image/bmp",
  // svg intentionally served as text/plain (like GitHub) to avoid XSS
  svg: "text/plain; charset=utf-8",
  html: "text/plain; charset=utf-8",
  htm: "text/plain; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  pdf: "application/pdf",
  woff: "font/woff",
  woff2: "font/woff2",
};

function extType(p: string): string {
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "text/plain; charset=utf-8";
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const repo = sp.get("repo") ?? "";
  const ref = sp.get("ref") ?? "";
  const p = sp.get("path") ?? "";
  const download = sp.get("download") === "1";

  const file = await readFileContent(repo, ref, p);
  if (!file) return new NextResponse("file not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": download ? "application/octet-stream" : extType(p),
    "Cache-Control": "no-cache",
  };
  if (download) {
    const base = p.split("/").pop() ?? "file";
    headers["Content-Disposition"] = `attachment; filename="${base.replace(/"/g, "")}"`;
  }
  return new NextResponse(new Uint8Array(file.buffer), { status: 200, headers });
}

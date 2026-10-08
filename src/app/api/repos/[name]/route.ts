import { NextRequest, NextResponse } from "next/server";
import { deleteRepo, getRepoMeta } from "@/lib/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const meta = await getRepoMeta(name);
  if (!meta) return NextResponse.json({ error: "repository not found" }, { status: 404 });
  return NextResponse.json({ repo: meta });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const ok = await deleteRepo(name);
  if (!ok) return NextResponse.json({ error: "repository not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

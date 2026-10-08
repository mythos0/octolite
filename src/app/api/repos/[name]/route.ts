import { NextRequest, NextResponse } from "next/server";
import { getRepoMeta } from "@/lib/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Repo metadata lookup. Private repos are only reachable when the caller
 * knows their full secret slug (name-secret), which acts as the credential.
 * Note: deletion is intentionally NOT exposed — the service has no auth,
 * so a public delete endpoint would let anyone destroy any repository.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const meta = await getRepoMeta(name);
  if (!meta) return NextResponse.json({ error: "repository not found" }, { status: 404 });
  return NextResponse.json({
    repo: {
      name: meta.name,
      displayName: meta.displayName,
      visibility: meta.visibility,
      description: meta.description,
      isEmpty: meta.isEmpty,
      defaultBranch: meta.defaultBranch,
      branches: meta.branches,
      commitCount: meta.commitCount,
      lastCommit: meta.lastCommit,
    },
  });
}

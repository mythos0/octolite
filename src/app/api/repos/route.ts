import { NextRequest, NextResponse } from "next/server";
import { createRepo, listRepos, type Visibility } from "@/lib/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const repos = await listRepos();
  return NextResponse.json({ repos });
}

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    description?: string;
    initReadme?: boolean;
    visibility?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const description = (body.description ?? "").trim().slice(0, 300);
  const initReadme = Boolean(body.initReadme);
  const visibility: Visibility = body.visibility === "private" ? "private" : "public";
  if (!name) return NextResponse.json({ error: "Repository name is required." }, { status: 400 });

  const res = await createRepo(name, description, initReadme, visibility);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(
    { ok: true, name: res.name, displayName: res.displayName, visibility: res.visibility },
    { status: 201 }
  );
}

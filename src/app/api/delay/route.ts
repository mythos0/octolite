import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary diagnostic route: /api/delay?ms=N sleeps N ms then replies.
export async function GET(req: NextRequest) {
  const ms = Math.min(5000, parseInt(req.nextUrl.searchParams.get("ms") ?? "0", 10) || 0);
  const start = Date.now();
  await new Promise((r) => setTimeout(r, ms));
  return NextResponse.json({ ok: true, requested: ms, took: Date.now() - start });
}

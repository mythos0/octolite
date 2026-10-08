/**
 * OctoLite proxy — rewrites pretty git clone URLs:
 *
 *   /<name>.git/info/refs  ->  /api/git/<name>.git/info/refs
 *   /<name>.git/git-upload-pack  ->  /api/git/<name>.git/git-upload-pack
 *   etc.
 *
 * This lets users clone/push with `https://<host>/<name>.git` — a GitHub-style URL.
 */
import { NextRequest, NextResponse } from "next/server";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const m = pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9._-]{0,100})\.git(\/.*)?$/);
  if (m) {
    const rest = m[2] ?? "";
    const url = req.nextUrl.clone();
    url.pathname = `/api/git/${m[1]}.git${rest}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

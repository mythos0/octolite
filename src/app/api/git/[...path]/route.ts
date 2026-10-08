/**
 * OctoLite — Git Smart HTTP backend (no auth).
 *
 * Implements the git smart-http protocol endpoints by shelling out to
 * `git upload-pack` / `git receive-pack` in --stateless-rpc mode:
 *
 *   GET  /api/git/<name>.git/info/refs?service=git-upload-pack    (clone/fetch/pull)
 *   GET  /api/git/<name>.git/info/refs?service=git-receive-pack   (push advertisement)
 *   POST /api/git/<name>.git/git-upload-pack
 *   POST /api/git/<name>.git/git-receive-pack
 *
 * Also supports "push-to-create": pushing to a non-existing repo creates it.
 */
import { NextRequest, NextResponse } from "next/server";
import zlib from "zlib";
import {
  ensureRepoForPush,
  isValidRepoName,
  repoDir,
  repoExists,
  runGit,
} from "@/lib/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pktLine(s: string): Buffer {
  const len = Buffer.byteLength(s) + 4;
  return Buffer.from(len.toString(16).padStart(4, "0") + s);
}

function notFound(msg = "repository not found") {
  return new NextResponse(msg, { status: 404 });
}

const NO_CACHE = {
  "Cache-Control": "no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "Fri, 01 Jan 1980 00:00:00 GMT",
} as const;

function protocolEnv(req: NextRequest): Record<string, string> | undefined {
  const p = req.headers.get("git-protocol");
  return p ? { GIT_PROTOCOL: p } : undefined;
}

async function handleGet(req: NextRequest, nameWithGit: string) {
  const repo = nameWithGit.replace(/\.git$/, "");
  const service = req.nextUrl.searchParams.get("service") ?? "";

  if (service !== "git-upload-pack" && service !== "git-receive-pack") {
    return new NextResponse("smart HTTP protocol required (dumb protocol not supported)", {
      status: 400,
    });
  }

  if (!repoExists(repo)) {
    if (service === "git-receive-pack") {
      // push-to-create
      const ok = await ensureRepoForPush(repo);
      if (!ok) return notFound("invalid repository name");
    } else {
      return notFound();
    }
  }

  const cmd = service.replace(/^git-/, "");
  const res = await runGit([cmd, "--stateless-rpc", "--advertise-refs", repoDir(repo)], {
    env: protocolEnv(req),
  });
  if (res.code !== 0) {
    return new NextResponse(`git ${cmd} failed: ${res.stderr}`, { status: 500 });
  }

  const body = Buffer.concat([
    pktLine(`# service=${service}\n`),
    Buffer.from("0000", "utf8"),
    res.stdout,
  ]);
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": `application/x-${service}-advertisement`,
      ...NO_CACHE,
    },
  });
}

async function handlePost(req: NextRequest, nameWithGit: string, svc: string) {
  const repo = nameWithGit.replace(/\.git$/, "");
  if (svc !== "git-upload-pack" && svc !== "git-receive-pack") {
    return new NextResponse("unsupported service", { status: 400 });
  }

  if (!repoExists(repo)) {
    if (svc === "git-receive-pack") {
      const ok = await ensureRepoForPush(repo);
      if (!ok) return notFound("invalid repository name");
    } else {
      return notFound();
    }
  }

  let input = Buffer.from(await req.arrayBuffer());
  if (req.headers.get("content-encoding") === "gzip") {
    try {
      input = zlib.gunzipSync(input);
    } catch {
      return new NextResponse("bad gzip body", { status: 400 });
    }
  }

  const res = await runGit([svc.replace(/^git-/, ""), "--stateless-rpc", repoDir(repo)], {
    input,
    env: protocolEnv(req),
  });
  if (res.code !== 0 && res.stdout.length === 0) {
    return new NextResponse(`git ${svc} failed: ${res.stderr}`, { status: 500 });
  }

  return new NextResponse(new Uint8Array(res.stdout), {
    status: 200,
    headers: {
      "Content-Type": `application/x-${svc}-result`,
      ...NO_CACHE,
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [nameWithGit] = path;
  if (!nameWithGit || !nameWithGit.endsWith(".git")) return notFound();
  const repo = nameWithGit.replace(/\.git$/, "");
  if (!repoExists(repo) && !isValidRepoName(repo)) return notFound();

  // /info/refs
  if (path.length === 3 && path[1] === "info" && path[2] === "refs") {
    return handleGet(req, nameWithGit);
  }
  // dumb-protocol object fetches are not supported
  return new NextResponse("dumb HTTP protocol not supported", { status: 403 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [nameWithGit, svc] = path;
  if (!nameWithGit || !nameWithGit.endsWith(".git")) return notFound();
  const repo = nameWithGit.replace(/\.git$/, "");
  if (!repoExists(repo) && !isValidRepoName(repo)) return notFound();

  if (path.length === 2 && (svc === "git-upload-pack" || svc === "git-receive-pack")) {
    return handlePost(req, nameWithGit, svc);
  }
  return new NextResponse("not found", { status: 404 });
}

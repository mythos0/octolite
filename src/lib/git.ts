/**
 * OctoLite — core git library.
 * Manages bare git repositories on disk and provides all read/write helpers
 * used by both the web UI and the Git Smart HTTP backend.
 */
import { spawn } from "child_process";
import { randomBytes } from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

export const GIT_ROOT = path.join(process.cwd(), "git-data");

export const RESERVED_NAMES = [
  "api",
  "_next",
  "static",
  "public",
  "favicon.ico",
  "download",
  "upload",
  "db",
  "prisma",
  "examples",
];

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,59}$/;

export type Visibility = "public" | "private";

interface OctoMetaFile {
  displayName: string;
  visibility: Visibility;
  secret?: string;
}

export function isValidRepoName(name: string): boolean {
  if (!NAME_RE.test(name)) return false;
  if (name.toLowerCase().includes(".git")) return false;
  if (RESERVED_NAMES.includes(name.toLowerCase())) return false;
  return true;
}

export function repoDir(name: string): string {
  return path.join(GIT_ROOT, `${name}.git`);
}

export function repoExists(name: string): boolean {
  return fs.existsSync(path.join(repoDir(name), "HEAD"));
}

/** Run a git command in a repo dir (async, streaming-friendly). */
export function runGit(
  args: string[],
  opts: { cwd?: string; input?: Buffer | string; env?: Record<string, string> } = {}
): Promise<{ code: number; stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
    });
    const out: Buffer[] = [];
    let err = "";
    child.stdout.on("data", (c) => out.push(c as Buffer));
    child.stderr.on("data", (c) => (err += c.toString()));
    child.on("error", reject);
    child.on("close", (code) =>
      resolve({ code: code ?? 0, stdout: Buffer.concat(out), stderr: err })
    );
    if (opts.input !== undefined) child.stdin.end(opts.input);
    else child.stdin.end();
  });
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const REF_RE = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,199}$/;

export function isValidRef(ref: string): boolean {
  if (!REF_RE.test(ref)) return false;
  if (ref.includes("..") || ref.includes("//") || ref.endsWith("/") || ref.endsWith(".lock"))
    return false;
  if (ref.includes("@{")) return false;
  return true;
}

/** Validate a path inside a repo ("a/b/c.txt" style). */
export function isValidRepoPath(p: string): boolean {
  if (p.length > 500) return false;
  if (p.includes("\\") || p.includes("\0")) return false;
  const segs = p.split("/");
  for (const s of segs) {
    if (s === "" || s === "." || s === "..") return false;
    if (s.endsWith(".lock")) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Repository management                                               */
/* ------------------------------------------------------------------ */

export interface RepoSummary {
  name: string;
  description: string;
  defaultBranch: string;
  branches: string[];
  commitCount: number;
  lastCommit: { sha: string; message: string; author: string; date: string } | null;
  createdAt: string;
  isPrivate: false;
}

export interface RepoMeta {
  /** Stored slug — includes the secret suffix for private repos. Used in all URLs. */
  name: string;
  /** Human-friendly name (secret stripped for private repos). */
  displayName: string;
  visibility: Visibility;
  description: string;
  createdAt: string;
  isEmpty: boolean;
  defaultBranch: string;
  branches: string[];
  commitCount: number;
  lastCommit: { sha: string; message: string; author: string; date: string } | null;
}

export async function listRepoNames(): Promise<string[]> {
  if (!fs.existsSync(GIT_ROOT)) await fsp.mkdir(GIT_ROOT, { recursive: true });
  const entries = await fsp.readdir(GIT_ROOT);
  return entries
    .filter((e) => e.endsWith(".git"))
    .filter((e) => fs.existsSync(path.join(GIT_ROOT, e, "HEAD")))
    .map((e) => e.slice(0, -4))
    .sort((a, b) => a.localeCompare(b));
}

async function gitBranches(dir: string): Promise<string[]> {
  const { stdout } = await runGit([
    "-C",
    dir,
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads",
  ]);
  return stdout
    .toString()
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function gitDefaultBranch(dir: string, branches: string[]): Promise<string> {
  const { stdout } = await runGit(["-C", dir, "symbolic-ref", "--short", "HEAD"]);
  const head = stdout.toString().trim();
  if (head && branches.includes(head)) return head;
  if (branches.includes("main")) return "main";
  if (branches.includes("master")) return "master";
  return branches[0] ?? head ?? "main";
}

async function gitLastCommit(dir: string, ref: string) {
  const { code, stdout } = await runGit([
    "-C",
    dir,
    "log",
    "-1",
    "--format=%H%x1f%s%x1f%an%x1f%cI",
    ref,
  ]);
  if (code !== 0) return null;
  const [sha, message, author, date] = stdout.toString().trim().split("\x1f");
  if (!sha) return null;
  return { sha, message, author, date };
}

async function gitCommitCount(dir: string, ref: string): Promise<number> {
  const { code, stdout } = await runGit(["-C", dir, "rev-list", "--count", ref]);
  if (code !== 0) return 0;
  return parseInt(stdout.toString().trim(), 10) || 0;
}

async function readOctoMeta(dir: string): Promise<OctoMetaFile | null> {
  try {
    const raw = await fsp.readFile(path.join(dir, "octolite.json"), "utf8");
    return JSON.parse(raw) as OctoMetaFile;
  } catch {
    return null;
  }
}

async function readDescription(dir: string): Promise<string> {
  try {
    const raw = await fsp.readFile(path.join(dir, "description"), "utf8");
    // git's default boilerplate means "no description set"
    if (raw.includes("Unnamed repository")) return "";
    return raw.trim();
  } catch {
    return "";
  }
}

export async function getRepoMeta(name: string): Promise<RepoMeta | null> {
  if (!repoExists(name)) return null;
  const dir = repoDir(name);
  const branches = await gitBranches(dir);
  const defaultBranch = await gitDefaultBranch(dir, branches);
  const isEmpty = branches.length === 0;
  const ref = defaultBranch || "HEAD";
  const [description, createdAt, lastCommit, commitCount, octo] = await Promise.all([
    readDescription(dir),
    repoCreatedAt(dir),
    isEmpty ? null : gitLastCommit(dir, ref),
    isEmpty ? 0 : gitCommitCount(dir, ref),
    readOctoMeta(dir),
  ]);
  return {
    name,
    displayName: octo?.displayName ?? name,
    visibility: octo?.visibility ?? "public",
    description,
    createdAt,
    isEmpty,
    defaultBranch,
    branches,
    commitCount,
    lastCommit,
  };
}

async function repoCreatedAt(dir: string): Promise<string> {
  try {
    const st = await fsp.stat(path.join(dir, "HEAD"));
    return st.birthtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/** Public repo listing — private repos are never exposed here. */
export async function listRepos(): Promise<RepoMeta[]> {
  const names = await listRepoNames();
  const metas = await Promise.all(names.map((n) => getRepoMeta(n)));
  return metas.filter((m): m is RepoMeta => m !== null && m.visibility === "public");
}

export interface CreateRepoResult {
  ok: boolean;
  error?: string;
  /** Stored slug (includes secret suffix for private repos) — used in URLs. */
  name?: string;
  displayName?: string;
  visibility?: Visibility;
  secret?: string;
}

export async function createRepo(
  name: string,
  description = "",
  initReadme = false,
  visibility: Visibility = "public"
): Promise<CreateRepoResult> {
  if (!isValidRepoName(name)) {
    return {
      ok: false,
      error:
        "Invalid repository name. Use letters, digits, '.', '_' or '-' (must start with a letter/digit, max 60 chars).",
    };
  }
  // Private repos live at <name>-<secret> — knowing the link is the only credential.
  const secret = visibility === "private" ? randomBytes(8).toString("hex") : undefined;
  const storedName = secret ? `${name}-${secret}` : name;
  if (!isValidRepoName(storedName)) {
    return { ok: false, error: "Invalid repository name." };
  }
  if (repoExists(storedName)) {
    return { ok: false, error: `Repository "${name}" already exists.` };
  }
  await fsp.mkdir(GIT_ROOT, { recursive: true });
  const dir = repoDir(storedName);
  const init = await runGit(["init", "--bare", "--initial-branch=main", dir]);
  if (init.code !== 0) return { ok: false, error: init.stderr || "git init failed" };
  await runGit(["-C", dir, "config", "http.receivepack", "true"]);
  await fsp.writeFile(
    path.join(dir, "description"),
    description || `${name} — hosted on OctoLite`,
    "utf8"
  );
  const octo: OctoMetaFile =
    visibility === "private"
      ? { displayName: name, visibility, secret }
      : { displayName: name, visibility };
  await fsp.writeFile(path.join(dir, "octolite.json"), JSON.stringify(octo), "utf8");
  if (initReadme) {
    const readme = [
      `# ${name}`,
      "",
      description ? `${description}\n` : "",
      "This repository was initialized with a README on OctoLite.",
      "",
      "## Clone it",
      "",
      "```bash",
      `git clone <this-site-url>/${name}.git`,
      "```",
      "",
    ].join("\n");
    const blob = await runGit(["-C", dir, "hash-object", "-w", "--stdin"], { input: readme });
    const tree = await runGit(["-C", dir, "mktree"], {
      input: `100644 blob ${blob.stdout.toString().trim()}\tREADME.md\n`,
    });
    const now = new Date().toISOString();
    const commit = await runGit(["-C", dir, "commit-tree", tree.stdout.toString().trim()], {
      input: "Initial commit",
      env: {
        GIT_AUTHOR_NAME: "OctoLite",
        GIT_AUTHOR_EMAIL: "octolite@localhost",
        GIT_COMMITTER_NAME: "OctoLite",
        GIT_COMMITTER_EMAIL: "octolite@localhost",
        GIT_AUTHOR_DATE: now,
        GIT_COMMITTER_DATE: now,
      },
    });
    await runGit([
      "-C",
      dir,
      "update-ref",
      "refs/heads/main",
      commit.stdout.toString().trim(),
    ]);
  }
  return {
    ok: true,
    name: storedName,
    displayName: name,
    visibility,
    secret,
  };
}

/** Create an empty bare repo for push-to-create (always public). */
export async function ensureRepoForPush(name: string): Promise<boolean> {
  if (!isValidRepoName(name)) return false;
  if (repoExists(name)) return true;
  const res = await createRepo(name, `${name} — created via git push`);
  return res.ok;
}

export async function deleteRepo(name: string): Promise<boolean> {
  if (!repoExists(name)) return false;
  const dir = repoDir(name);
  // Safety: make sure we only ever delete inside GIT_ROOT
  if (!dir.startsWith(GIT_ROOT)) return false;
  await fsp.rm(dir, { recursive: true, force: true });
  return true;
}

/* ------------------------------------------------------------------ */
/* Browsing helpers                                                    */
/* ------------------------------------------------------------------ */

export interface TreeEntry {
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size: number | null;
  name: string;
  path: string;
}

export async function listTree(
  repo: string,
  ref: string,
  dirPath: string
): Promise<TreeEntry[] | null> {
  if (!repoExists(repo) || !isValidRef(ref)) return null;
  if (dirPath && !isValidRepoPath(dirPath)) return null;
  const dir = repoDir(repo);
  const spec = dirPath ? `${ref}:${dirPath}` : ref;
  const { code, stdout } = await runGit(["-C", dir, "ls-tree", "-l", spec]);
  if (code !== 0) return null;
  const entries: TreeEntry[] = [];
  for (const line of stdout.toString().split("\n")) {
    if (!line.trim()) continue;
    const [meta, name] = line.split("\t");
    const [mode, type, sha, size] = meta.split(/\s+/);
    entries.push({
      mode,
      type: type as TreeEntry["type"],
      sha,
      size: size && size !== "-" ? parseInt(size, 10) : null,
      name,
      path: dirPath ? `${dirPath}/${name}` : name,
    });
  }
  // folders first, alphabetical
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return entries;
}

export async function pathType(
  repo: string,
  ref: string,
  p: string
): Promise<"blob" | "tree" | null> {
  if (!repoExists(repo) || !isValidRef(ref)) return null;
  if (p && !isValidRepoPath(p)) return null;
  const spec = p ? `${ref}:${p}` : ref;
  const { code, stdout } = await runGit(["-C", repoDir(repo), "cat-file", "-t", spec]);
  if (code !== 0) return null;
  const t = stdout.toString().trim();
  return t === "blob" || t === "tree" ? t : null;
}

export interface FileContent {
  isBinary: boolean;
  size: number;
  text: string | null;
  buffer: Buffer;
}

export async function readFileContent(
  repo: string,
  ref: string,
  p: string
): Promise<FileContent | null> {
  if (!repoExists(repo) || !isValidRef(ref) || !p || !isValidRepoPath(p)) return null;
  const { code, stdout } = await runGit([
    "-C",
    repoDir(repo),
    "cat-file",
    "blob",
    `${ref}:${p}`,
  ]);
  if (code !== 0) return null;
  const isBinary = stdout.subarray(0, 8000).includes(0);
  return {
    isBinary,
    size: stdout.length,
    text: isBinary ? null : stdout.toString("utf8"),
    buffer: stdout,
  };
}

export interface CommitInfo {
  sha: string;
  short: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  body: string;
}

const COMMIT_FMT = "%H%x1f%h%x1f%an%x1f%ae%x1f%cI%x1f%s%x1f%b%x1e";

export async function listCommits(
  repo: string,
  ref: string,
  limit = 30,
  skip = 0
): Promise<CommitInfo[]> {
  if (!repoExists(repo) || !isValidRef(ref)) return [];
  const { code, stdout } = await runGit([
    "-C",
    repoDir(repo),
    "log",
    `--max-count=${limit}`,
    `--skip=${skip}`,
    `--format=${COMMIT_FMT}`,
    ref,
  ]);
  if (code !== 0) return [];
  return parseCommitLog(stdout.toString());
}

function parseCommitLog(raw: string): CommitInfo[] {
  const out: CommitInfo[] = [];
  for (const chunk of raw.split("\x1e")) {
    const line = chunk.replace(/^\n+/, "").trimEnd();
    if (!line) continue;
    const [sha, short, author, email, date, subject, ...body] = line.split("\x1f");
    if (!sha) continue;
    out.push({ sha, short, author, email, date, subject, body: body.join("\x1f").trim() });
  }
  return out;
}

export interface CommitDetail extends CommitInfo {
  filesChanged: number;
  additions: number;
  deletions: number;
  patch: string;
  parents: string[];
}

export async function getCommitDetail(
  repo: string,
  sha: string
): Promise<CommitDetail | null> {
  if (!repoExists(repo)) return null;
  if (!/^[a-fA-F0-9]{4,40}$/.test(sha)) return null;
  const dir = repoDir(repo);
  const meta = await runGit([
    "-C",
    dir,
    "show",
    "-s",
    "--format=%H%x1f%h%x1f%an%x1f%ae%x1f%cI%x1f%s%x1f%b%x1f%P",
    sha,
  ]);
  if (meta.code !== 0) return null;
  const [h, short, author, email, date, subject, body, parents] = meta.stdout
    .toString()
    .trim()
    .split("\x1f");
  const patch = await runGit(
    ["-C", dir, "show", "--format=", "--patch", "--no-color", "--unified=3", sha],
    {}
  );
  const diffText = patch.stdout.toString();
  const { additions, deletions, filesChanged } = countDiff(diffText);
  return {
    sha: h,
    short,
    author,
    email,
    date,
    subject,
    body: body?.trim() ?? "",
    parents: (parents ?? "").split(/\s+/).filter(Boolean),
    filesChanged,
    additions,
    deletions,
    patch: diffText,
  };
}

export function countDiff(patch: string): {
  additions: number;
  deletions: number;
  filesChanged: number;
} {
  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git")) filesChanged++;
    else if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }
  return { additions, deletions, filesChanged };
}

export interface BranchInfo {
  name: string;
  isDefault: boolean;
  lastCommit: { sha: string; message: string; author: string; date: string } | null;
}

export async function listBranches(repo: string): Promise<BranchInfo[] | null> {
  if (!repoExists(repo)) return null;
  const dir = repoDir(repo);
  const branches = await gitBranches(dir);
  const defaultBranch = await gitDefaultBranch(dir, branches);
  const infos = await Promise.all(
    branches.map(async (b) => ({
      name: b,
      isDefault: b === defaultBranch,
      lastCommit: await gitLastCommit(dir, b),
    }))
  );
  return infos;
}

/** Find the README file (case-insensitive) in a tree listing. */
export function findReadme(entries: TreeEntry[]): TreeEntry | null {
  return (
    entries.find(
      (e) => e.type === "blob" && /^readme(\.(md|markdown|txt))?$/i.test(e.name)
    ) ?? null
  );
}

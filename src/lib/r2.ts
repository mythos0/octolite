/**
 * OctoLite — Cloudflare R2 object-storage backend (optional).
 *
 * Why: serverless hosts (Vercel) have an ephemeral filesystem, so bare git
 * repositories cannot persist between requests. When R2 is configured, each
 * bare repo is stored as ONE gzipped tar object:
 *
 *   <prefix>/<storedName>.tar.gz
 *
 * - On miss  — the object is pulled from R2 and unpacked into the local git
 *   root before any git/UI operation touches it (repo materialization).
 * - On write — after a successful `git receive-pack` (push) or an API repo
 *   creation, the repo is packed and PUT back to R2.
 *
 * When the R2_* env vars are absent, the app falls back to plain local-disk
 * storage — that is what the sandbox preview uses, so no credentials are
 * needed for local development.
 *
 * Concurrency note (documented limitation): per-repo sync is serialized
 * within one instance; concurrent pushes from DIFFERENT serverless
 * instances are last-write-wins. Fine for a no-auth mirror of this scale.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { spawn } from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const SECRET = process.env.R2_SECRET_ACCESS_KEY?.trim();
const BUCKET = process.env.R2_BUCKET?.trim();
const PREFIX = (process.env.R2_PREFIX?.trim() || "repos").replace(/^\/+|\/+$/g, "");

/** R2 mode is on only when every required credential is present. */
export function r2Enabled(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET && BUCKET);
}

function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID!,
      secretAccessKey: SECRET!,
    },
  });
}

function objectKey(storedName: string): string {
  return `${PREFIX}/${storedName}.tar.gz`;
}

/** Run a helper binary (tar), resolving with its exit code. */
function run(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "ignore" });
    child.on("error", () => resolve(127));
    child.on("close", (code) => resolve(code ?? 1));
  });
}

/**
 * Pull a repo tarball from R2 and unpack it into `root`.
 * Returns true when the repo directory exists afterwards.
 */
export async function pullRepoFromR2(storedName: string, root: string): Promise<boolean> {
  if (!r2Enabled()) return false;
  const destDir = path.join(root, storedName);
  if (fs.existsSync(path.join(destDir, "HEAD"))) return true; // already local

  try {
    const client = r2Client();
    const res = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: objectKey(storedName) })
    );
    if (!res.Body) return false;
    const bytes = await res.Body.transformToByteArray();

    await fsp.mkdir(root, { recursive: true });
    const tmp = path.join(os.tmpdir(), `octolite-pull-${storedName}-${Date.now()}.tar.gz`);
    await fsp.writeFile(tmp, bytes);

    // replace any partial local copy, then unpack
    await fsp.rm(destDir, { recursive: true, force: true });
    const code = await run("tar", ["-xzf", tmp, "-C", root]);
    await fsp.rm(tmp, { force: true });
    if (code !== 0) return false;
    return fs.existsSync(path.join(destDir, "HEAD"));
  } catch {
    return false; // object missing or R2 error → caller treats as not-found
  }
}

/**
 * Pack a repo directory from `root` and upload it to R2.
 * Returns false only when R2 is enabled but the sync failed.
 */
export async function pushRepoToR2(storedName: string, root: string): Promise<boolean> {
  if (!r2Enabled()) return true; // local mode — nothing to sync
  const srcDir = path.join(root, storedName);
  if (!fs.existsSync(path.join(srcDir, "HEAD"))) return false;

  const tmp = path.join(os.tmpdir(), `octolite-push-${storedName}-${Date.now()}.tar.gz`);
  try {
    // numeric owner keeps the tarball clean of build-user uid noise
    const code = await run("tar", [
      "--numeric-owner",
      "--owner=0",
      "--group=0",
      "-czf",
      tmp,
      "-C",
      root,
      storedName,
    ]);
    if (code !== 0) return false;

    const body = await fsp.readFile(tmp);
    const client = r2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: objectKey(storedName),
        Body: body,
        ContentType: "application/gzip",
      })
    );
    return true;
  } catch {
    return false;
  } finally {
    await fsp.rm(tmp, { force: true }).catch(() => {});
  }
}

/** Remove a repo object from R2 (used by the internal delete helper). */
export async function deleteRepoFromR2(storedName: string): Promise<void> {
  if (!r2Enabled()) return;
  try {
    const client = r2Client();
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: objectKey(storedName) }));
  } catch {
    // best-effort — local deletion already happened
  }
}

/** List stored repo names straight from R2 (used for listings in R2 mode). */
export async function listR2Repos(): Promise<string[]> {
  if (!r2Enabled()) return [];
  try {
    const client = r2Client();
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${PREFIX}/` })
    );
    return (res.Contents ?? [])
      .map((o) => o.Key ?? "")
      .filter((k) => k.startsWith(`${PREFIX}/`) && k.endsWith(".tar.gz"))
      .map((k) => k.slice(PREFIX.length + 1, -".tar.gz".length))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

# OctoLite — no-login git hosting

A minimal, self-hosted GitHub clone. Create repositories, browse code, and
`clone` / `pull` / `push` with **just the link — no account, no SSH keys, no
tokens**. Built with Next.js 16 (App Router) and the real `git` binary over
the Smart HTTP protocol.

```
git clone https://your-host.com/my-repo.git      # that's it
```

## Features

- **Zero auth** — every repository is reachable by its URL. Clone, pull and
  push without creating an account or generating credentials.
- **Public & private repositories** — pick the visibility when creating.
  Public repos are listed and open to everyone; private repos live behind an
  unguessable secret link (`/<name>-<secret>.git`) and never appear in any
  listing or API response.
- **Push-to-create** — push to a URL that doesn't exist yet and the
  repository is created for you (public).
- **GitHub-style web UI** — dark theme, file browser with line numbers,
  rendered READMEs (GFM), commit history with pagination, per-commit diffs
  with red/green lines and +/- stats, branch list and switcher, breadcrumbs,
  raw & download links.
- **Raw & download** — fetch any file at
  `/api/raw?repo=...&ref=...&path=...` with optional `&download=1`.
- **Real git backend** — bare repositories on disk, served through
  `git upload-pack` / `git receive-pack` in `--stateless-rpc` mode. Any
  standard git client works.
- **Optional Cloudflare R2 storage** — for serverless hosts (Vercel) with an
  ephemeral disk, repos are synced to an R2 bucket and materialized locally
  on demand. Unconfigured = plain local disk (dev default).
- **No delete** — the service has no authentication, so deletion is
  intentionally NOT exposed over HTTP (no UI button, no API route). Anyone
  with server access can remove a repo on disk; see below.

## Quick start

```bash
bun install
bun run dev            # http://localhost:3000
```

## Using it

| Action | Command |
| --- | --- |
| Clone | `git clone http://<host>/<repo>.git` |
| Push (existing) | `git remote add origin http://<host>/<repo>.git && git push -u origin main` |
| Push-to-create | `git push http://<host>/brand-new.git main` |
| Clone a private repo | `git clone http://<host>/<repo>-<secret>.git` |

Or do it all from the web UI: create a repository (choose **Public** or
**Private**, optionally initialize with a README), then copy the clone URL
from the repo header.

**Public repos** are open to everyone: listed on the home page, browsable,
cloneable and pushable by anyone with the link.

**Private repos:** the secret link *is* the credential. Anyone who has it can
browse, clone, pull **and push** — share it carefully. Private repos are never
listed on the home page or in the API, and their clone URL only works with the
full secret slug.

**No delete UI:** the service has no authentication, so deletion is
intentionally not exposed over HTTP — anyone could delete any repository.
Remove a repo on the server with:

```bash
rm -rf git-data/<repo>.git
```

## Deploy to Vercel + Cloudflare R2

Vercel's filesystem is ephemeral, so repositories need durable object
storage. OctoLite syncs each bare repo to R2 as a single tarball:

- **on miss** — pulled from R2 and unpacked locally before any git/UI read
  or write (cold-start materialization),
- **on write** — after a successful push (`git receive-pack`) or an API
  repo creation, the repo is packed and PUT back to R2.

When the `R2_*` variables below are absent the app simply uses local disk —
so development and the sandbox preview need no credentials.

### 1. Create the Cloudflare resources

1. **R2 bucket** — Cloudflare dashboard → *R2 Object Storage* →
   **Create bucket** (e.g. `octolite`). Note the **Account ID** from the
   dashboard's right sidebar.
2. **R2 API token** — *R2* → *Manage R2 API Tokens* → **Create API Token** →
   permissions **Object Read & Write**, scope it to the bucket. You get an
   **Access Key ID** and a **Secret Access Key** (shown once).

### 2. Set the environment variables in Vercel

Project → *Settings* → *Environment Variables* (Production + Preview):

| Variable | Value | Where it comes from |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare **Account ID** | dashboard right sidebar |
| `R2_ACCESS_KEY_ID` | R2 token **Access Key ID** | created in step 1 |
| `R2_SECRET_ACCESS_KEY` | R2 token **Secret Access Key** | created in step 1 (shown once) |
| `R2_BUCKET` | bucket name (e.g. `octolite`) | created in step 1 |
| `R2_PREFIX` | *(optional)* key prefix, default `repos` | — |

That's the complete list — no other secrets are required; the app itself has
no auth by design. See `.env.example` for the same table in file form.

### 3. Deploy

```bash
npm i -g vercel
vercel            # link the project
vercel --prod
```

(or import the repo in the Vercel dashboard — zero config; the build script
detects Vercel and skips the standalone-server assembly automatically).

### 4. (Optional) Custom domain

Vercel → *Settings* → *Domains* → add your domain, then create a CNAME at
your DNS provider pointing to `cname.vercel-dns.com`.

### Limitations to know about

- Concurrent pushes to the SAME repo from different serverless instances are
  last-write-wins (each instance materializes its own local copy). Fine for
  small teams / personal hosting at this scale.
- Git Smart HTTP requests run up to `maxDuration = 60`s per request.

## Architecture

```
src/
├── proxy.ts                     # rewrites /<name>.git/* → /api/git/* (pretty clone URLs)
├── lib/git.ts                   # bare-repo CRUD, validation, ls-tree/log/show/diff helpers
├── lib/r2.ts                    # optional Cloudflare R2 sync layer (pull-on-miss, push-on-write)
├── lib/repo-path.ts             # GitHub-style /tree/<ref>/<dir…> URL resolution
├── app/
│   ├── page.tsx                 # home: repo list, search, create dialog, quick setup
│   ├── [repo]/
│   │   ├── page.tsx             # repo code view + README
│   │   ├── tree/[...path]/      # directory browser (/<repo>/tree/<ref>/<dir…>)
│   │   ├── blob/[...path]/      # file view (code, images, markdown)
│   │   ├── commits/             # paginated history
│   │   ├── commit/[sha]/        # diff view
│   │   └── branches/            # branch list
│   └── api/
│       ├── git/[...path]/route.ts   # Git Smart HTTP (info/refs, upload-pack, receive-pack)
│       ├── repos/route.ts           # GET list (public only) · POST create
│       ├── repos/[name]/route.ts    # GET repo metadata
│       └── raw/route.ts             # raw file endpoint
└── components/git/              # navbar, repo header, file table, diff viewer, markdown, …
```

### How the git protocol works here

1. `git clone http://host/repo.git` first requests
   `GET /repo.git/info/refs?service=git-upload-pack`.
2. `src/proxy.ts` rewrites that to `/api/git/repo.git/info/refs?...`.
3. The route handler advertises refs by running
   `git upload-pack --stateless-rpc --advertise-refs git-data/repo.git`
   and wrapping the output in pkt-line framing.
4. The client then `POST`s to `/repo.git/git-receive-pack` (push) or
   `/repo.git/git-upload-pack` (fetch); the handler pipes the (optionally
   gzip-encoded) body straight into the matching `git` subprocess and streams
   the response back.

Bare repositories are stored under `git-data/<name>.git` (override with the
`GIT_DATA_DIR` env var; the app falls back to `/tmp/octolite-git-data` on
read-only filesystems). Private repos are stored as
`git-data/<name>-<secret>.git`, which is what makes the secret link work for
git clients with zero auth code.

### Validation & safety

- Repo names: `[a-zA-Z0-9][a-zA-Z0-9._-]{0,59}`, no `.git` suffix, reserved
  names blocked (`api`, `_next`, `static`, …).
- Refs and paths are validated (`..`, `\0`, `.lock`, `@{`, leading/trailing
  slashes rejected) before touching the filesystem; every git invocation goes
  through a validated `spawn("git", …)` with no shell interpolation.

## Tests

`scripts/e2e-local.sh` runs a 24-check end-to-end suite against a running
instance (create public/private, listing privacy, secret-slug access rules,
clone / push / pull, push-to-create, no-delete routes, UI pages):

```bash
bash scripts/e2e-local.sh http://localhost:3000
```

## Tech stack

- [Next.js](https://nextjs.org) 16 · App Router · Turbopack
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS 4 + lucide-react
- [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm
- [AWS SDK S3 client](https://github.com/aws/aws-sdk-js-v3) — S3-compatible Cloudflare R2
- git 2.47 via `child_process` (Smart HTTP, stateless RPC)
- [Bun](https://bun.sh) as the package manager / runtime

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `GIT_DATA_DIR` | `<cwd>/git-data` | Where bare repos are stored (falls back to `/tmp/octolite-git-data`) |
| `R2_ACCOUNT_ID` | — | Cloudflare account ID (enables R2 mode when set with the rest) |
| `R2_ACCESS_KEY_ID` | — | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | — | R2 API token secret |
| `R2_BUCKET` | — | R2 bucket name |
| `R2_PREFIX` | `repos` | Object key prefix inside the bucket |
| `PORT` | `3000` | HTTP port |

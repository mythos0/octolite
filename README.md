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
  Private repos live behind an unguessable secret link
  (`/<name>-<secret>.git`) and never appear in any listing.
- **Push-to-create** — push to a URL that doesn't exist yet and the
  repository is created for you (public).
- **GitHub-style web UI** — dark theme, file browser with line numbers,
  rendered READMEs (GFM), commit history with pagination, per-commit diffs
  with red/green lines and +/- stats, branch list and switcher.
- **Raw & download** — fetch any file at `/api/raw?repo=...&ref=...&path=...`
  with optional `&download=1`.
- **Real git backend** — bare repositories on disk, served through
  `git upload-pack` / `git receive-pack` in `--stateless-rpc` mode. Any
  standard git client works.

## Quick start

```bash
bun install
bun run dev            # http://localhost:3000
```

Seed the demo repository (`welcome`, 3 real commits):

```bash
bun run scripts/seed-welcome.ts
```

### Production

```bash
bun run build
bun run start          # serves the standalone build
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

## Architecture

```
src/
├── proxy.ts                     # rewrites /<name>.git/* → /api/git/* (pretty clone URLs)
├── lib/git.ts                   # bare-repo CRUD, validation, ls-tree/log/show/diff helpers
├── app/
│   ├── page.tsx                 # home: repo list, search, create dialog, quick setup
│   ├── [repo]/
│   │   ├── page.tsx             # repo code view + README
│   │   ├── tree/[...path]/      # directory browser
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

## Tech stack

- [Next.js](https://nextjs.org) 16 · App Router · Turbopack
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS 4 + lucide-react
- [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm
- git 2.47 via `child_process` (Smart HTTP, stateless RPC)
- [Bun](https://bun.sh) as the package manager / runtime

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `GIT_DATA_DIR` | `<cwd>/git-data` | Where bare repos are stored (falls back to `/tmp/octolite-git-data`) |
| `PORT` | `3000` | HTTP port |

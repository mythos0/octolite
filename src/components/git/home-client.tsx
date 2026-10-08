"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookMarked,
  GitBranch,
  Search,
  Terminal,
  UploadCloud,
  CloudDownload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateRepoDialog } from "./create-repo-dialog";
import { timeAgo } from "@/lib/time";

interface RepoItem {
  name: string;
  displayName: string;
  visibility: "public" | "private";
  description: string;
  defaultBranch: string;
  branches: string[];
  commitCount: number;
  isEmpty: boolean;
  lastCommit: { date: string } | null;
  createdAt: string;
}

function CodeLine({ children }: { children: string }) {
  return (
    <code className="block bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 font-mono text-xs sm:text-sm text-[#79c0ff] overflow-x-auto whitespace-pre">
      {children}
    </code>
  );
}

export function HomeClient() {
  const router = useRouter();
  const [repos, setRepos] = useState<RepoItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/repos")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setOrigin(window.location.origin);
        setRepos(d.repos ?? []);
      })
      .catch(() => {
        if (!alive) return;
        setOrigin(window.location.origin);
        setRepos([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!repos) return null;
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.displayName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [repos, query]);

  return (
    <div className="flex flex-col gap-8">
      {/* Hero / actions */}
      <section className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Repositories</h1>
          <p className="text-sm text-[#8b949e] mt-1">
            Minimal GitHub-style hosting — no login, no keys. Clone, pull and push with
            just the link. Private repos stay hidden unless you have their secret link.
          </p>
        </div>
        <CreateRepoDialog />
      </section>

      {/* How it works */}
      <section aria-label="How it works" className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#e6edf3]">
            <CloudDownload className="size-4 text-[#3fb950]" aria-hidden /> 1. Clone
          </div>
          <CodeLine>{`git clone ${origin || "<this-site>"}/my-repo.git`}</CodeLine>
        </div>
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#e6edf3]">
            <UploadCloud className="size-4 text-[#3fb950]" aria-hidden /> 2. Push
          </div>
          <CodeLine>{`git remote add origin ${origin || "<this-site>"}/my-repo.git\ngit push -u origin main`}</CodeLine>
        </div>
        <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#e6edf3]">
            <Terminal className="size-4 text-[#3fb950]" aria-hidden /> 3. Push-to-create
          </div>
          <CodeLine>{`# repo is created automatically (public):\ngit push ${origin || "<this-site>"}/brand-new.git main`}</CodeLine>
        </div>
      </section>

      {/* Search */}
      <section aria-label="Repository list" className="flex flex-col gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8b949e]" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a repository…"
            aria-label="Find a repository"
            className="pl-9 bg-[#0d1117] border-[#30363d] text-[#e6edf3] placeholder:text-[#6e7681]"
          />
        </div>

        {filtered === null ? (
          <div className="py-16 text-center text-sm text-[#8b949e]">Loading repositories…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#30363d] py-16 text-center">
            <BookMarked className="size-10 mx-auto text-[#6e7681]" aria-hidden />
            <p className="mt-3 text-[#8b949e] text-sm">
              {query ? "No repositories match your search." : "No public repositories yet — create one or just push to it."}
            </p>
            {!query ? (
              <p className="mt-2 text-xs text-[#6e7681]">
                Tip: the push-to-create command above makes a repo instantly. Private repos are
                never listed here.
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-[#30363d] border border-[#30363d] rounded-lg">
            {filtered.map((r) => (
              <li key={r.name} className="flex items-start gap-3 p-4 hover:bg-[#161b22] transition-colors">
                <BookMarked className="size-5 mt-0.5 text-[#8b949e] shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/${r.name}`}
                      className="font-semibold text-[#4493f8] hover:underline break-all"
                    >
                      {r.displayName || r.name}
                    </Link>
                    <span className="text-xs text-[#8b949e] border border-[#30363d] rounded-full px-2 py-0.5">
                      Public
                    </span>
                  </div>
                  {r.description ? (
                    <p className="text-sm text-[#8b949e] mt-0.5 line-clamp-2">{r.description}</p>
                  ) : null}
                  <p className="text-xs text-[#6e7681] mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="size-3" aria-hidden /> {r.defaultBranch}
                    </span>
                    <span>{r.isEmpty ? "0 commits" : `${r.commitCount} commit${r.commitCount === 1 ? "" : "s"}`}</span>
                    <span>
                      {r.isEmpty
                        ? `Created ${timeAgo(r.createdAt)}`
                        : `Updated ${r.lastCommit ? timeAgo(r.lastCommit.date) : ""}`}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
                    onClick={() => router.push(`/${r.name}/commits`)}
                  >
                    Commits
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

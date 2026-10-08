"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookMarked, Code, GitBranch, History, Lock, Scale } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

export interface RepoHeaderProps {
  name: string;
  description: string;
  defaultBranch: string;
  branches: string[];
  commitCount: number;
  currentRef: string;
  activeTab: "code" | "commits" | "branches";
}

export function RepoHeader(p: RepoHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cloneUrl = useMemo(() => {
    if (typeof window === "undefined") return `/${p.name}.git`;
    return `${window.location.origin}/${p.name}.git`;
  }, [p.name]);

  function refBasePath(ref: string) {
    const q = ref === p.defaultBranch ? "" : `?ref=${encodeURIComponent(ref)}`;
    return q;
  }

  const tabs = [
    { key: "code" as const, label: "Code", icon: Code, href: `/${p.name}` },
    { key: "commits" as const, label: "Commits", icon: History, href: `/${p.name}/commits` },
    { key: "branches" as const, label: "Branches", icon: GitBranch, href: `/${p.name}/branches` },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <BookMarked className="size-5 mt-1 text-[#8b949e]" aria-hidden />
        <h1 className="text-xl font-semibold flex flex-wrap items-center gap-2 min-w-0">
          <Link href="/" className="text-[#4493f8] hover:underline" aria-label="All repositories">
            OctoLite
          </Link>
          <span className="text-[#6e7681] font-normal">/</span>
          <Link href={`/${p.name}`} className="text-[#4493f8] hover:underline break-all">
            {p.name}
          </Link>
          <span className="text-xs text-[#8b949e] border border-[#30363d] rounded-full px-2 py-0.5 font-normal">
            Public
          </span>
        </h1>
      </div>

      {p.description ? (
        <p className="text-sm text-[#8b949e] -mt-1">{p.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-b border-[#30363d] pb-3">
        {/* Branch selector */}
        <Select
          value={p.currentRef}
          onValueChange={(v) => {
            const sp = new URLSearchParams(searchParams.toString());
            if (v === p.defaultBranch) sp.delete("ref");
            else sp.set("ref", v);
            const qs = sp.toString();
            router.push(`${pathname}${qs ? `?${qs}` : ""}`);
          }}
        >
          <SelectTrigger
            aria-label="Switch branch"
            className="h-8 w-auto min-w-36 bg-[#21262d] border-[#30363d] text-[#e6edf3] text-sm gap-1"
          >
            <GitBranch className="size-3.5 text-[#8b949e]" aria-hidden />
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent className="bg-[#161b22] border-[#30363d] text-[#e6edf3]">
            {p.branches.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[#8b949e]">No branches yet</div>
            ) : (
              p.branches.map((b) => (
                <SelectItem key={b} value={b} className="hover:bg-[#21262d]">
                  {b}
                  {b === p.defaultBranch ? (
                    <span className="ml-2 text-[10px] text-[#8b949e]">default</span>
                  ) : null}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <div className="hidden sm:flex items-center gap-4 text-xs text-[#8b949e]">
          <span className="inline-flex items-center gap-1">
            <GitBranch className="size-3.5" aria-hidden />
            <strong className="text-[#e6edf3] font-semibold">{p.branches.length}</strong>{" "}
            branch{p.branches.length === 1 ? "" : "es"}
          </span>
          <span className="inline-flex items-center gap-1">
            <History className="size-3.5" aria-hidden />
            <strong className="text-[#e6edf3] font-semibold">{p.commitCount}</strong>{" "}
            commit{p.commitCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Clone box */}
        <div className="ml-auto flex items-center rounded-md overflow-hidden border border-[#30363d] bg-[#0d1117] max-w-full">
          <Lock className="size-3.5 mx-2 text-[#8b949e] shrink-0" aria-hidden />
          <input
            readOnly
            value={cloneUrl}
            aria-label="Git clone URL"
            onFocus={(e) => e.currentTarget.select()}
            className="bg-transparent text-xs font-mono text-[#e6edf3] py-1.5 w-44 sm:w-64 outline-none truncate"
          />
          <CopyButton value={cloneUrl} className="rounded-none border-0 border-l border-[#30363d]" />
        </div>
      </div>

      {/* Tabs */}
      <nav aria-label="Repository sections" className="flex items-center gap-1 -mt-1">
        {tabs.map((t) => {
          const href =
            t.key === "code" ? t.href + refBasePath(p.currentRef) : t.href;
          const active = p.activeTab === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-transparent hover:bg-[#161b22]",
                active && "border-[#30363d] bg-[#161b22] font-semibold"
              )}
              aria-current={active ? "page" : undefined}
            >
              <t.icon className="size-4 text-[#8b949e]" aria-hidden />
              {t.label}
            </Link>
          );
        })}
        <span className="ml-auto hidden md:inline-flex items-center gap-1 text-xs text-[#6e7681]">
          <Scale className="size-3" aria-hidden /> no login • no limits
        </span>
      </nav>
    </div>
  );
}

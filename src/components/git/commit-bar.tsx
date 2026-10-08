import Link from "next/link";
import { GitCommitVertical } from "lucide-react";
import type { CommitInfo } from "@/lib/git";
import { timeAgo } from "@/lib/time";

export function AuthorAvatar({ name, size = "size-5" }: { name: string; size?: string }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className={`${size} rounded-full bg-gradient-to-br from-[#1f6feb] to-[#8957e5] text-white text-[10px] font-semibold inline-flex items-center justify-center shrink-0`}
    >
      {letter}
    </span>
  );
}

export function CommitBar({ repo, refName, commit }: { repo: string; refName: string; commit: CommitInfo }) {
  return (
    <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-t-md px-3 py-2 text-sm">
      <AuthorAvatar name={commit.author} />
      <span className="font-semibold text-[#e6edf3]">{commit.author}</span>
      <Link
        href={`/${repo}/commit/${commit.sha}`}
        className="text-[#8b949e] hover:text-[#4493f8] truncate min-w-0"
        title={commit.subject}
      >
        {commit.subject}
      </Link>
      <span className="ml-auto flex items-center gap-2 shrink-0 text-xs text-[#8b949e]">
        <Link href={`/${repo}/commit/${commit.sha}`} className="font-mono hover:text-[#4493f8]">
          {commit.short}
        </Link>
        <span className="inline-flex items-center gap-1">
          <GitCommitVertical className="size-3.5" aria-hidden />
          {timeAgo(commit.date)}
        </span>
      </span>
    </div>
  );
}

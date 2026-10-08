import Link from "next/link";
import { notFound } from "next/navigation";
import { GitCommitHorizontal } from "lucide-react";
import { getRepoMeta, isValidRef, listCommits } from "@/lib/git";
import { formatDate, timeAgo } from "@/lib/time";
import { RepoHeader } from "@/components/git/repo-header";
import { RepoShell } from "@/components/git/repo-shell";
import { AuthorAvatar } from "@/components/git/commit-bar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function CommitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ repo: string }>;
  searchParams: Promise<{ ref?: string; page?: string }>;
}) {
  const { repo } = await params;
  const { ref: refParam, page: pageParam } = await searchParams;
  const meta = await getRepoMeta(repo);
  if (!meta) notFound();

  const refName =
    refParam && meta.branches.includes(refParam) && isValidRef(refParam)
      ? refParam
      : meta.defaultBranch;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const commits = meta.isEmpty
    ? []
    : await listCommits(repo, refName, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE);
  const hasMore = commits.length > PAGE_SIZE;
  const shown = commits.slice(0, PAGE_SIZE);

  const qs = (p: number) => {
    const sp = new URLSearchParams();
    if (refParam && refParam !== meta.defaultBranch) sp.set("ref", refParam);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/${repo}/commits${s ? `?${s}` : ""}`;
  };

  return (
    <RepoShell
      header={
        <RepoHeader
          name={meta.name}
          description={meta.description}
          defaultBranch={meta.defaultBranch}
          branches={meta.branches}
          commitCount={meta.commitCount}
          currentRef={refName}
          activeTab="commits"
        />
      }
    >
      {shown.length === 0 ? (
        <div className="border border-dashed border-[#30363d] rounded-md py-16 text-center text-sm text-[#8b949e]">
          No commits yet — push some code first.
        </div>
      ) : (
        <ul className="border border-[#30363d] rounded-md divide-y divide-[#30363d]/60">
          {shown.map((c) => (
            <li key={c.sha} className="flex items-start gap-3 px-4 py-3 hover:bg-[#161b22]">
              <AuthorAvatar name={c.author} size="size-7" />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/${repo}/commit/${c.sha}`}
                  className="font-semibold text-sm text-[#e6edf3] hover:text-[#4493f8] line-clamp-2"
                >
                  {c.subject}
                </Link>
                <p className="text-xs text-[#8b949e] mt-0.5 flex flex-wrap items-center gap-x-2">
                  <span className="font-medium text-[#c9d1d9]">{c.author}</span>
                  <span>committed {timeAgo(c.date)}</span>
                  <span title={formatDate(c.date)} className="hidden sm:inline">
                    ({formatDate(c.date)})
                  </span>
                  {c.body ? (
                    <GitCommitHorizontal className="size-3 text-[#6e7681]" aria-hidden />
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/${repo}/commit/${c.sha}`}
                  className="hidden sm:inline-flex font-mono text-xs bg-[#21262d] border border-[#30363d] rounded-md px-2 py-1 text-[#c9d1d9] hover:border-[#4493f8] hover:text-[#4493f8]"
                  aria-label={`View commit ${c.short}`}
                >
                  {c.short}
                </Link>
                <Link
                  href={`/${repo}/commit/${c.sha}`}
                  className="text-xs text-[#4493f8] hover:underline sm:hidden"
                >
                  view
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <nav aria-label="Commit pages" className="flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link href={qs(page - 1)} className="text-[#4493f8] hover:underline">
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        {hasMore ? (
          <Link href={qs(page + 1)} className="text-[#4493f8] hover:underline">
            Older →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </RepoShell>
  );
}

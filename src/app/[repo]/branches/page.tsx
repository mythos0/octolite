import Link from "next/link";
import { notFound } from "next/navigation";
import { GitBranch } from "lucide-react";
import { getRepoMeta, listBranches } from "@/lib/git";
import { timeAgo } from "@/lib/time";
import { RepoHeader } from "@/components/git/repo-header";
import { RepoShell } from "@/components/git/repo-shell";

export const dynamic = "force-dynamic";

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ repo: string }>;
}) {
  const { repo } = await params;
  const meta = await getRepoMeta(repo);
  if (!meta) notFound();

  const branches = await listBranches(repo);

  return (
    <RepoShell
      header={
        <RepoHeader
          name={meta.name}
          description={meta.description}
          defaultBranch={meta.defaultBranch}
          branches={meta.branches}
          commitCount={meta.commitCount}
          currentRef={meta.defaultBranch}
          activeTab="branches"
        />
      }
    >
      {branches === null || branches.length === 0 ? (
        <div className="border border-dashed border-[#30363d] rounded-md py-16 text-center text-sm text-[#8b949e]">
          No branches yet — push to <span className="font-mono text-[#79c0ff]">{meta.name}.git</span> to create the first one.
        </div>
      ) : (
        <ul className="border border-[#30363d] rounded-md divide-y divide-[#30363d]/60">
          {branches.map((b) => (
            <li key={b.name} className="flex items-center gap-3 px-4 py-3 hover:bg-[#161b22]">
              <GitBranch className="size-4 text-[#8b949e]" aria-hidden />
              <Link
                href={`/${repo}?ref=${encodeURIComponent(b.name)}`}
                className="font-mono text-sm text-[#4493f8] hover:underline break-all"
              >
                {b.name}
              </Link>
              {b.isDefault ? (
                <span className="text-[10px] text-[#8b949e] border border-[#30363d] rounded-full px-2 py-0.5">
                  default
                </span>
              ) : null}
              <span className="ml-auto text-xs text-[#8b949e] shrink-0 text-right">
                {b.lastCommit ? (
                  <>
                    {b.lastCommit.message} · updated {timeAgo(b.lastCommit.date)}
                  </>
                ) : null}
              </span>
              <Link
                href={`/${repo}/commits?ref=${encodeURIComponent(b.name)}`}
                className="shrink-0 text-xs text-[#8b949e] border border-[#30363d] rounded-md px-2 py-1 hover:text-[#4493f8] hover:border-[#4493f8]"
              >
                history
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RepoShell>
  );
}

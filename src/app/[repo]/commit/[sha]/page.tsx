import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCommitDetail, getRepoMeta } from "@/lib/git";
import { formatDate } from "@/lib/time";
import { RepoShell } from "@/components/git/repo-shell";
import { AuthorAvatar } from "@/components/git/commit-bar";
import { DiffView } from "@/components/git/diff-view";
import { CopyButton } from "@/components/git/copy-button";

export const dynamic = "force-dynamic";

export default async function CommitPage({
  params,
}: {
  params: Promise<{ repo: string; sha: string }>;
}) {
  const { repo, sha } = await params;
  const meta = await getRepoMeta(repo);
  if (!meta) notFound();

  const commit = await getCommitDetail(repo, sha);
  if (!commit) notFound();

  return (
    <RepoShell header={null}>
      <Link
        href={`/${repo}/commits`}
        className="inline-flex items-center gap-1.5 text-sm text-[#4493f8] hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to commits
      </Link>

      <div className="border border-[#30363d] rounded-md bg-[#161b22] px-4 py-3">
        <h1 className="text-lg font-semibold break-words">{commit.subject}</h1>
        {commit.body ? (
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-[#8b949e]">
            {commit.body}
          </pre>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8b949e]">
          <AuthorAvatar name={commit.author} />
          <span className="font-semibold text-[#e6edf3]">{commit.author}</span>
          <span>committed on {formatDate(commit.date)}</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="font-mono bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-[#c9d1d9]">
              {commit.short}
            </span>
            <CopyButton value={commit.sha} />
          </span>
        </div>
        {commit.parents.length > 0 ? (
          <p className="mt-2 text-xs text-[#6e7681]">
            parent{commit.parents.length > 1 ? "s" : ""}:{" "}
            {commit.parents.map((p) => (
              <span key={p} className="font-mono mr-2">
                {p.slice(0, 7)}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <p className="text-sm text-[#8b949e]">
        <span className="font-semibold text-[#e6edf3]">{commit.filesChanged}</span> file
        {commit.filesChanged === 1 ? "" : "s"} changed:{" "}
        <span className="text-[#3fb950] font-mono">+{commit.additions}</span>{" "}
        <span className="text-[#f85149] font-mono">−{commit.deletions}</span>
      </p>

      <DiffView patch={commit.patch} />
    </RepoShell>
  );
}

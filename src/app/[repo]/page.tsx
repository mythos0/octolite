import { notFound } from "next/navigation";
import {
  findReadme,
  getRepoMeta,
  isValidRef,
  listCommits,
  listTree,
  readFileContent,
} from "@/lib/git";
import { getOrigin } from "@/lib/origin";
import { RepoHeader } from "@/components/git/repo-header";
import { RepoShell } from "@/components/git/repo-shell";
import { FileTable } from "@/components/git/file-table";
import { CommitBar } from "@/components/git/commit-bar";
import { MarkdownView } from "@/components/git/markdown-view";
import { QuickSetup } from "@/components/git/quick-setup";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RepoPage({
  params,
  searchParams,
}: {
  params: Promise<{ repo: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { repo } = await params;
  const { ref: refParam } = await searchParams;
  const meta = await getRepoMeta(repo);
  if (!meta) notFound();

  const refName =
    refParam && meta.branches.includes(refParam) && isValidRef(refParam)
      ? refParam
      : meta.defaultBranch;

  const header = (
    <RepoHeader
      name={meta.name}
      displayName={meta.displayName}
      visibility={meta.visibility}
      description={meta.description}
      defaultBranch={meta.defaultBranch}
      branches={meta.branches}
      commitCount={meta.commitCount}
      currentRef={refName}
      activeTab="code"
    />
  );

  if (meta.isEmpty) {
    const origin = await getOrigin();
    return (
      <RepoShell header={header}>
        <QuickSetup repo={meta.name} cloneUrl={`${origin}/${meta.name}.git`} />
      </RepoShell>
    );
  }

  const [entries, tipCommits] = await Promise.all([
    listTree(repo, refName, ""),
    listCommits(repo, refName, 1),
  ]);
  if (entries === null) notFound();
  const tip = tipCommits[0];

  const readmeEntry = findReadme(entries);
  const readme = readmeEntry ? await readFileContent(repo, refName, readmeEntry.path) : null;

  return (
    <RepoShell header={header}>
      {tip ? <CommitBar repo={repo} refName={refName} commit={tip} /> : null}
      <FileTable repo={repo} refName={refName} entries={entries} basePath="" />

      {readme && readme.text !== null && readmeEntry ? (
        <section aria-label="README" className="mt-6 border border-[#30363d] rounded-md">
          <header className="flex items-center gap-2 border-b border-[#30363d] px-4 py-2.5">
            <BookOpen className="size-4 text-[#8b949e]" aria-hidden />
            <span className="text-sm font-semibold">{readmeEntry.name}</span>
          </header>
          <div className="px-4 sm:px-6 py-4 octo-scroll overflow-x-auto">
            <MarkdownView content={readme.text} />
          </div>
        </section>
      ) : null}
    </RepoShell>
  );
}

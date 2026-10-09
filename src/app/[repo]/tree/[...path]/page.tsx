import { notFound } from "next/navigation";
import { findReadme, getRepoMeta, listCommits, listTree, pathType, readFileContent } from "@/lib/git";
import { resolveRefAndPath } from "@/lib/repo-path";
import { RepoHeader } from "@/components/git/repo-header";
import { RepoShell } from "@/components/git/repo-shell";
import { FileTable } from "@/components/git/file-table";
import { CommitBar } from "@/components/git/commit-bar";
import { Breadcrumb } from "@/components/git/breadcrumb";
import { MarkdownView } from "@/components/git/markdown-view";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * GitHub-style tree URL: /<repo>/tree/<ref>/<dir…>
 * The ref is resolved from the leading path segments (longest branch match,
 * or a commit sha); the rest is the directory path.
 */
export default async function TreePage({
  params,
}: {
  params: Promise<{ repo: string; path: string[] }>;
}) {
  const { repo, path } = await params;
  const meta = await getRepoMeta(repo);
  if (!meta) notFound();

  const { ref: refName, segments, dirPath } = resolveRefAndPath(
    path ?? [],
    meta.branches,
    meta.defaultBranch
  );

  // At the ref root the tree renders directly; deeper paths are checked so a
  // blob URL under /tree redirects to /blob (and unknown paths 404).
  if (segments.length > 0) {
    const type = await pathType(repo, refName, dirPath);
    if (type === "blob") {
      const { redirect } = await import("next/navigation");
      redirect(`/${repo}/blob/${[refName, ...segments].map(encodeURIComponent).join("/")}`);
    }
    if (type === null) notFound();
  }

  const [entries, tipCommits] = await Promise.all([
    listTree(repo, refName, dirPath),
    listCommits(repo, refName, 1),
  ]);
  if (entries === null) notFound();
  const tip = tipCommits[0];

  const readmeEntry = findReadme(entries);
  const readme = readmeEntry ? await readFileContent(repo, refName, readmeEntry.path) : null;

  return (
    <RepoShell
      header={
        <>
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
          <Breadcrumb
            repo={repo}
            label={meta.displayName}
            refName={refName}
            segments={segments}
            lastIsBlob={false}
          />
        </>
      }
    >
      {tip ? <CommitBar repo={repo} refName={refName} commit={tip} /> : null}
      <FileTable repo={repo} refName={refName} entries={entries} basePath={dirPath} />

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

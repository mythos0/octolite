import { notFound } from "next/navigation";
import { Download, FileText, Images, ScrollText } from "lucide-react";
import { getRepoMeta, pathType, readFileContent } from "@/lib/git";
import { resolveRefAndPath } from "@/lib/repo-path";
import { formatBytes } from "@/lib/time";
import { RepoHeader } from "@/components/git/repo-header";
import { RepoShell } from "@/components/git/repo-shell";
import { Breadcrumb } from "@/components/git/breadcrumb";
import { CodeView } from "@/components/git/code-view";
import { MarkdownView } from "@/components/git/markdown-view";
import { CopyButton } from "@/components/git/copy-button";

export const dynamic = "force-dynamic";

const IMAGE_RE = /\.(png|jpe?g|gif|webp|ico|bmp)$/i;
const MD_RE = /\.(md|markdown)$/i;

function rawUrl(repo: string, ref: string, p: string, download: boolean) {
  return `/api/raw?repo=${encodeURIComponent(repo)}&ref=${encodeURIComponent(
    ref
  )}&path=${encodeURIComponent(p)}${download ? "&download=1" : ""}`;
}

/**
 * GitHub-style blob URL: /<repo>/blob/<ref>/<file…>
 * The ref is resolved from the leading path segments (longest branch match,
 * or a commit sha); the rest is the file path.
 */
export default async function BlobPage({
  params,
}: {
  params: Promise<{ repo: string; path: string[] }>;
}) {
  const { repo, path } = await params;
  const meta = await getRepoMeta(repo);
  if (!meta) notFound();

  const { ref: refName, segments, dirPath: filePath } = resolveRefAndPath(
    path ?? [],
    meta.branches,
    meta.defaultBranch
  );
  if (!filePath) notFound();

  const type = await pathType(repo, refName, filePath);
  if (type === "tree") {
    const { redirect } = await import("next/navigation");
    redirect(`/${repo}/tree/${[refName, ...segments].map(encodeURIComponent).join("/")}`);
  }
  if (type === null) notFound();

  const file = await readFileContent(repo, refName, filePath);
  if (!file) notFound();

  const lines = file.text !== null ? file.text.replace(/\r\n/g, "\n").split("\n").length : 0;
  const fileName = filePath.split("/").pop() ?? "";
  const isImage = IMAGE_RE.test(fileName) && !file.isBinary;
  const isMd = MD_RE.test(fileName) && !file.isBinary;
  const raw = rawUrl(repo, refName, filePath, false);

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
          <Breadcrumb repo={repo} label={meta.displayName} refName={refName} segments={segments} lastIsBlob />
        </>
      }
    >
      <div className="border border-[#30363d] rounded-md overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 bg-[#161b22] border-b border-[#30363d] px-3 py-2 text-xs text-[#8b949e]">
          <span className="inline-flex items-center gap-1">
            {isImage ? (
              <Images className="size-3.5" aria-hidden />
            ) : isMd ? (
              <FileText className="size-3.5" aria-hidden />
            ) : (
              <ScrollText className="size-3.5" aria-hidden />
            )}
            {file.isBinary
              ? `${formatBytes(file.size)}`
              : `${lines} line${lines === 1 ? "" : "s"} · ${formatBytes(file.size)}`}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {!file.isBinary && file.text !== null && file.size <= 100 * 1024 ? (
              <CopyButton value={file.text} label="Copy" />
            ) : null}
            <a
              href={raw}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-[#30363d] bg-[#21262d] px-2.5 py-1.5 text-xs text-[#e6edf3] hover:bg-[#30363d]"
            >
              Raw
            </a>
            <a
              href={rawUrl(repo, refName, filePath, true)}
              className="inline-flex items-center gap-1 rounded-md border border-[#30363d] bg-[#21262d] px-2.5 py-1.5 text-xs text-[#e6edf3] hover:bg-[#30363d]"
              aria-label={`Download ${fileName}`}
            >
              <Download className="size-3" aria-hidden />
              Download
            </a>
          </span>
        </div>

        {isImage ? (
          <div className="bg-[#0d1117] p-6 flex items-center justify-center">
            <img
              src={raw}
              alt={fileName}
              className="max-w-full max-h-[480px] rounded border border-[#30363d] bg-[#161b22]"
            />
          </div>
        ) : file.isBinary ? (
          <p className="p-6 text-sm text-[#8b949e]">
            This is a binary file ({formatBytes(file.size)}) — preview is not available. Use{" "}
            <a href={rawUrl(repo, refName, filePath, true)} className="text-[#4493f8] hover:underline">
              Download
            </a>{" "}
            to get it.
          </p>
        ) : isMd ? (
          <div className="px-4 sm:px-6 py-4 octo-scroll overflow-x-auto">
            <MarkdownView content={file.text ?? ""} />
          </div>
        ) : (
          <CodeView content={file.text ?? ""} />
        )}
      </div>
    </RepoShell>
  );
}

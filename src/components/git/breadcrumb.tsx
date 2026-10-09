import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Breadcrumb for tree/blob paths, GitHub-style:
 *
 *   repo / <ref> / a / b / c.txt
 *
 * `segments` are the in-repo path segments AFTER the ref. The ref crumb
 * links back to the ref root tree; intermediate segments link to their
 * tree URLs; the final segment is plain text (bold) when it is a blob.
 */
export function Breadcrumb({
  repo,
  label,
  refName,
  segments,
  lastIsBlob,
}: {
  repo: string;
  label?: string;
  refName: string;
  segments: string[];
  lastIsBlob: boolean;
}) {
  const enc = (s: string) => encodeURIComponent(s);
  const treeAt = (pathSoFar: string) =>
    `/${repo}/tree/${[refName, ...pathSoFar.split("/")].map(enc).join("/")}`;

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-lg min-w-0">
      <Link href={`/${repo}`} className="font-semibold text-[#4493f8] hover:underline">
        {label || repo}
      </Link>
      <span className="flex items-center gap-1 min-w-0">
        <ChevronRight className="size-4 text-[#6e7681] shrink-0" aria-hidden />
        {segments.length === 0 ? (
          <span className="font-semibold text-[#e6edf3] break-all">{refName}</span>
        ) : (
          <Link
            href={`/${repo}/tree/${enc(refName)}`}
            className="text-[#4493f8] hover:underline break-all"
          >
            {refName}
          </Link>
        )}
      </span>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const pathSoFar = segments.slice(0, i + 1).join("/");
        const href = isLast && lastIsBlob ? `/${repo}/blob/${[refName, ...segments.slice(0, i + 1)].map(enc).join("/")}` : treeAt(pathSoFar);
        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="size-4 text-[#6e7681] shrink-0" aria-hidden />
            {isLast ? (
              <span className="font-semibold text-[#e6edf3] break-all">{seg}</span>
            ) : (
              <Link href={href} className="text-[#4493f8] hover:underline break-all">
                {seg}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Breadcrumb for tree/blob paths: repo / a / b / c.txt */
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
  const qs = refName ? `?ref=${encodeURIComponent(refName)}` : "";
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-lg min-w-0">
      <Link href={`/${repo}${qs}`} className="font-semibold text-[#4493f8] hover:underline">
        {label || repo}
      </Link>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const pathSoFar = segments.slice(0, i + 1).join("/");
        const href =
          isLast && lastIsBlob
            ? `/${repo}/blob/${pathSoFar}${qs}`
            : `/${repo}/tree/${pathSoFar}${qs}`;
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

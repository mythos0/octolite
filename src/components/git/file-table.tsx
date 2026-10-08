import Link from "next/link";
import { File, Folder, FileCode2 } from "lucide-react";
import type { TreeEntry } from "@/lib/git";
import { formatBytes } from "@/lib/time";

const IMG_RE = /\.(png|jpe?g|gif|webp|ico|bmp|svg)$/i;

export function FileIcon({ entry }: { entry: TreeEntry }) {
  if (entry.type === "tree") return <Folder className="size-4 text-[#7d8590] fill-[#7d8590]/30" aria-hidden />;
  if (IMG_RE.test(entry.name)) return <File className="size-4 text-[#7d8590]" aria-hidden />;
  return <FileCode2 className="size-4 text-[#7d8590]" aria-hidden />;
}

export function FileTable({
  repo,
  refName,
  entries,
  basePath,
}: {
  repo: string;
  refName: string;
  entries: TreeEntry[];
  basePath: string; // "" for root, "a/b" for subdir
}) {
  const qs = refName ? `?ref=${encodeURIComponent(refName)}` : "";
  return (
    <div className="border border-[#30363d] rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {entries.map((e) => (
            <tr key={e.path} className="border-b border-[#30363d]/60 last:border-0 hover:bg-[#161b22]">
              <td className="py-2 pl-3 pr-2 w-8 align-middle">
                <FileIcon entry={e} />
              </td>
              <td className="py-2 pr-4 align-middle min-w-0">
                <Link
                  href={
                    e.type === "tree"
                      ? `/${repo}/tree/${basePath ? basePath + "/" : ""}${e.name}${qs}`
                      : `/${repo}/blob/${basePath ? basePath + "/" : ""}${e.name}${qs}`
                  }
                  className="text-[#e6edf3] hover:text-[#4493f8] hover:underline break-all"
                >
                  {e.name}
                </Link>
              </td>
              <td className="py-2 pr-3 text-right text-xs text-[#6e7681] whitespace-nowrap align-middle hidden sm:table-cell">
                {e.type === "blob" && e.size !== null ? formatBytes(e.size) : "—"}
              </td>
            </tr>
          ))}
          {entries.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-8 text-center text-sm text-[#8b949e]">
                Empty directory
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

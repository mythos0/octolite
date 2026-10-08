import { FileDiff } from "lucide-react";

interface DiffLine {
  type: "add" | "del" | "ctx" | "meta" | "hunk";
  text: string;
  oldNo: number | null;
  newNo: number | null;
}

interface DiffFile {
  path: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
  binary: boolean;
}

export function parsePatch(patch: string): DiffFile[] {
  const files: DiffFile[] = [];
  let cur: DiffFile | null = null;
  let oldNo = 0;
  let newNo = 0;

  for (const raw of patch.split("\n")) {
    if (raw.startsWith("diff --git")) {
      const m = raw.match(/^diff --git a\/(.*) b\/(.*)$/);
      cur = {
        path: m ? m[2] : raw.replace("diff --git ", ""),
        lines: [],
        additions: 0,
        deletions: 0,
        binary: false,
      };
      files.push(cur);
      continue;
    }
    if (!cur) continue;
    if (raw.startsWith("index ") || raw.startsWith("mode ") || raw.startsWith("similarity") ||
        raw.startsWith("rename ") || raw.startsWith("old mode") || raw.startsWith("new mode") ||
        raw.startsWith("new file mode") || raw.startsWith("deleted file mode") ||
        raw.startsWith("--- ") || raw.startsWith("+++ ")) {
      // noisy metadata — hide for a cleaner GitHub-style diff
      continue;
    }
    if (raw.startsWith("Binary files") || raw.startsWith("GIT binary patch")) {
      cur.binary = true;
      cur.lines.push({ type: "meta", text: raw, oldNo: null, newNo: null });
      continue;
    }
    if (raw.startsWith("--- ") || raw.startsWith("+++ ")) {
      cur.lines.push({ type: "meta", text: raw, oldNo: null, newNo: null });
      continue;
    }
    if (raw.startsWith("@@")) {
      const m = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      oldNo = m ? parseInt(m[1], 10) : 0;
      newNo = m ? parseInt(m[2], 10) : 0;
      cur.lines.push({ type: "hunk", text: raw, oldNo: null, newNo: null });
      continue;
    }
    if (raw.startsWith("+")) {
      cur.additions++;
      cur.lines.push({ type: "add", text: raw.slice(1), oldNo: null, newNo: newNo++ });
      continue;
    }
    if (raw.startsWith("-")) {
      cur.deletions++;
      cur.lines.push({ type: "del", text: raw.slice(1), oldNo: oldNo++, newNo: null });
      continue;
    }
    if (raw.startsWith(" ") || raw === "") {
      cur.lines.push({ type: "ctx", text: raw.slice(1), oldNo: oldNo++, newNo: newNo++ });
      continue;
    }
    // "\ No newline at end of file" etc.
    cur.lines.push({ type: "meta", text: raw, oldNo: null, newNo: null });
  }
  return files;
}

export function DiffView({ patch }: { patch: string }) {
  const files = parsePatch(patch);

  if (files.length === 0) {
    return (
      <p className="text-sm text-[#8b949e] border border-[#30363d] rounded-md p-4 bg-[#161b22]">
        No textual changes to show (empty or merge commit).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {files.map((f, fi) => (
        <div key={fi} className="border border-[#30363d] rounded-md overflow-hidden">
          <div className="flex items-center gap-2 bg-[#161b22] border-b border-[#30363d] px-3 py-2">
            <FileDiff className="size-4 text-[#8b949e]" aria-hidden />
            <span className="font-mono text-xs text-[#e6edf3] break-all">{f.path}</span>
            <span className="ml-auto text-xs font-mono shrink-0">
              <span className="text-[#3fb950]">+{f.additions}</span>{" "}
              <span className="text-[#f85149]">−{f.deletions}</span>
            </span>
          </div>
          <div className="octo-scroll overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[12px] leading-5">
              <tbody>
                {f.lines.map((l, li) => (
                  <tr
                    key={li}
                    className={
                      l.type === "add"
                        ? "bg-[#12261e]"
                        : l.type === "del"
                          ? "bg-[#2d1c20]"
                          : l.type === "hunk"
                            ? "bg-[#10161d]"
                            : ""
                    }
                  >
                    <td className="select-none text-right pr-2 pl-3 w-px align-top text-[#6e7681]">
                      {l.oldNo ?? ""}
                    </td>
                    <td className="select-none text-right pr-3 w-px align-top text-[#6e7681]">
                      {l.newNo ?? ""}
                    </td>
                    <td
                      className={
                        "pl-2 pr-4 align-top whitespace-pre " +
                        (l.type === "add"
                          ? "text-[#7ee787]"
                          : l.type === "del"
                            ? "text-[#ffa198]"
                            : l.type === "hunk"
                              ? "text-[#8b949e]"
                              : l.type === "meta"
                                ? "text-[#6e7681]"
                                : "text-[#e6edf3]")
                      }
                    >
                      {l.type === "add" ? "+" : l.type === "del" ? "-" : ""}
                      {l.text || "\u00A0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

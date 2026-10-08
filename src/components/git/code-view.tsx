/** Line-numbered code view (plain, GitHub-dark styled). */
export function CodeView({ content, maxLines = 5000 }: { content: string; maxLines?: number }) {
  const allLines = content.replace(/\r\n/g, "\n").split("\n");
  // drop trailing empty line artifact of final newline
  if (allLines.length > 1 && allLines[allLines.length - 1] === "") allLines.pop();
  const lines = allLines.slice(0, maxLines);

  return (
    <div className="octo-scroll overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[12.5px] leading-5">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-[#161b22]">
              <td
                aria-hidden
                className="select-none text-right pr-4 pl-4 w-px align-top text-[#6e7681] border-r border-[#30363d]/60"
              >
                {i + 1}
              </td>
              <td className="pl-4 pr-4 align-top whitespace-pre text-[#e6edf3]">
                {line || "\u00A0"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {allLines.length > maxLines ? (
        <p className="px-4 py-3 text-xs text-[#8b949e] border-t border-[#30363d]">
          Showing first {maxLines} of {allLines.length} lines — use Raw to view the full file.
        </p>
      ) : null}
    </div>
  );
}

import Link from "next/link";

export function RepoShell({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#e6edf3]">
      <header className="sticky top-0 z-30 bg-[#010409] border-b border-[#30363d]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-[#e6edf3] hover:opacity-90">
            <span
              className="inline-block size-6 rounded-full bg-gradient-to-br from-[#1f6feb] to-[#8957e5]"
              aria-hidden
            />
            OctoLite
          </Link>
          <span className="text-[#6e7681] text-sm hidden sm:inline">/ no-login git hosting</span>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 flex flex-col gap-5">
        {header}
        {children}
      </main>
      <footer className="mt-auto border-t border-[#30363d] py-5 text-center text-xs text-[#6e7681]">
        OctoLite — minimal git hosting. Clone, pull &amp; push with just the link.
      </footer>
    </div>
  );
}

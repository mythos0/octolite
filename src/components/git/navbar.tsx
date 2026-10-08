import Link from "next/link";
import { GitBranch } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-[#010409] border-b border-[#30363d]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-[#e6edf3] hover:opacity-90">
          <GitBranch className="size-7 text-[#e6edf3]" aria-hidden />
          <span className="font-semibold text-lg tracking-tight">OctoLite</span>
          <span className="ml-1 text-xs border border-[#30363d] rounded-full px-2 py-0.5 text-[#8b949e] hidden sm:inline">
            no-login git hosting
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm text-[#e6edf3]" aria-label="Main">
          <Link href="/" className="hover:text-[#4493f8]">
            Repositories
          </Link>
          <a
            href="https://git-scm.com/docs/git-remote"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#4493f8] hidden sm:inline"
          >
            Git docs
          </a>
        </nav>
      </div>
    </header>
  );
}

import { Navbar } from "@/components/git/navbar";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#e6edf3]">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-24 text-center">
        <p className="font-mono text-6xl text-[#30363d]">404</p>
        <h1 className="mt-4 text-2xl font-semibold">This is not the repository you are looking for.</h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          The repository may have been deleted, renamed, or never pushed at all.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 rounded-md bg-[#21262d] border border-[#30363d] px-4 py-2 text-sm hover:bg-[#30363d]"
        >
          Go to all repositories
        </Link>
      </main>
    </div>
  );
}

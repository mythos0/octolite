import { HomeClient } from "@/components/git/home-client";
import { Navbar } from "@/components/git/navbar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#e6edf3]">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        <HomeClient />
      </main>
      <footer className="mt-auto border-t border-[#30363d] py-6">
        <div className="max-w-6xl mx-auto px-4 text-xs text-[#6e7681] flex flex-wrap items-center justify-between gap-2">
          <span>OctoLite — a tiny GitHub clone. No login. Git Smart HTTP, nothing else.</span>
          <span>Powered by Next.js + real git</span>
        </div>
      </footer>
    </div>
  );
}

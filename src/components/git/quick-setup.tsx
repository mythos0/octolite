import { Rocket } from "lucide-react";
import { CopyButton } from "./copy-button";

function Cmd({ lines }: { lines: string[] }) {
  return (
    <div className="relative group">
      <pre className="octo-scroll overflow-x-auto bg-[#0d1117] border border-[#30363d] rounded-md p-3 pr-12 font-mono text-xs sm:text-sm text-[#79c0ff] whitespace-pre">
        {lines.join("\n")}
      </pre>
      <div className="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition-opacity">
        <CopyButton value={lines.join("\n")} />
      </div>
    </div>
  );
}

export function QuickSetup({ repo, cloneUrl }: { repo: string; cloneUrl: string }) {
  return (
    <div className="border border-[#30363d] rounded-md bg-[#161b22] p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Rocket className="size-5 text-[#3fb950]" aria-hidden />
        <h2 className="font-semibold">Quick setup — you push, we host</h2>
      </div>
      <p className="text-sm text-[#8b949e] -mt-2">
        This repository is empty. No login is needed — anyone with the link can clone it
        and push to it.
      </p>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Create a new repository from scratch</h3>
        <Cmd
          lines={[
            `git clone ${cloneUrl}`,
            `cd ${repo}`,
            `echo "# ${repo}" > README.md`,
            `git add . && git commit -m "first commit"`,
            `git push -u origin main`,
          ]}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Push an existing repository</h3>
        <Cmd
          lines={[
            `cd existing-project`,
            `git remote set-url origin ${cloneUrl}   # or: git remote add origin ${cloneUrl}`,
            `git push -u origin main`,
          ]}
        />
      </section>

      <p className="text-xs text-[#6e7681]">
        Tip: you can also create a brand-new repository by pushing to{" "}
        <span className="font-mono text-[#79c0ff]">{cloneUrl.replace(repo, "any-name")}</span>{" "}
        — it is created automatically (push-to-create).
      </p>
    </div>
  );
}

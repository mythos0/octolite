/**
 * Seed the demo repository "welcome" (3 real commits).
 * Safe to re-run: skips creation if the repo already exists.
 *
 *   bun run scripts/seed-welcome.ts
 */
import { createRepo, repoExists, runGit, repoDir } from "../src/lib/git";

async function commit(
  dir: string,
  message: string,
  files: Record<string, string>,
  date: string
) {
  const treeEntries: string[] = [];
  for (const [p, content] of Object.entries(files)) {
    const blob = await runGit(["-C", dir, "hash-object", "-w", "--stdin"], {
      input: content,
    });
    treeEntries.push(`100644 blob ${blob.stdout.toString().trim()}\t${p}`);
  }
  const tree = await runGit(["-C", dir, "mktree"], { input: treeEntries.join("\n") + "\n" });
  const env = {
    GIT_AUTHOR_NAME: "OctoLite",
    GIT_AUTHOR_EMAIL: "octolite@localhost",
    GIT_COMMITTER_NAME: "OctoLite",
    GIT_COMMITTER_EMAIL: "octolite@localhost",
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  };
  const commitRes = await runGit(["-C", dir, "commit-tree", tree.stdout.toString().trim()], {
    input: message,
    env,
  });
  await runGit(["-C", dir, "update-ref", "refs/heads/main", commitRes.stdout.toString().trim()]);
}

async function main() {
  if (repoExists("welcome")) {
    console.log("welcome repo already exists — nothing to do");
    return;
  }
  const res = await createRepo(
    "welcome",
    "A sample repository — clone it, push to it, break it. No login needed.",
    false,
    "public"
  );
  if (!res.ok) throw new Error(res.error ?? "createRepo failed");
  const dir = repoDir("welcome");

  await commit(
    dir,
    "Initial commit",
    {
      "README.md": [
        "# Welcome to OctoLite",
        "",
        "This is a live demo repository. You can clone it, commit to it and push —",
        "no login, no token, no SSH key. The link is all you need.",
        "",
        "```bash",
        "git clone <this-site-url>/welcome.git",
        "```",
        "",
        "Try the quick setup on the home page, or push a brand-new repo with:",
        "",
        "```bash",
        "git push <this-site-url>/my-new-repo.git main",
        "```",
        "",
      ].join("\n"),
    },
    "2026-10-01T09:00:00Z"
  );

  await commit(
    dir,
    "Add project notes",
    {
      "README.md": [
        "# Welcome to OctoLite",
        "",
        "This is a live demo repository. You can clone it, commit to it and push —",
        "no login, no token, no SSH key. The link is all you need.",
        "",
        "```bash",
        "git clone <this-site-url>/welcome.git",
        "```",
        "",
        "## Notes",
        "",
        "- Push-to-create works: push to any URL and the repo appears.",
        "- Private repos live behind secret links — see the home page.",
        "- Everything is a real bare git repo on the server.",
        "",
      ].join("\n"),
      "NOTES.md": "# Notes\n\nNothing to see here. Yet.\n",
    },
    "2026-10-02T10:30:00Z"
  );

  await commit(
    dir,
    "final verification commit",
    {
      "NOTES.md":
        "# Notes\n\nNothing to see here. Yet.\n\nEdited during end-to-end verification.\n",
    },
    "2026-10-03T15:45:00Z"
  );

  console.log("seeded: welcome (3 commits)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

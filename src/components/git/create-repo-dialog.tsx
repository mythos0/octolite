"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function CreateRepoDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initReadme, setInitReadme] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description, initReadme }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create repository");
        setCreating(false);
        return;
      }
      setOpen(false);
      startTransition(() => router.push(`/${data.name}`));
    } catch {
      setError("Network error, please try again");
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger asChild>
        <Button className="bg-[#238636] hover:bg-[#2ea043] text-white font-medium">
          <Plus className="size-4" aria-hidden />
          New repository
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#161b22] border-[#30363d] text-[#e6edf3] max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new repository</DialogTitle>
          <DialogDescription className="text-[#8b949e]">
            No account needed. Clone and push with just the link.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repo-name">Repository name *</Label>
            <Input
              id="repo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              autoFocus
              required
              className="bg-[#0d1117] border-[#30363d] text-[#e6edf3] placeholder:text-[#6e7681]"
            />
            <p className="text-xs text-[#8b949e]">
              Letters, digits, &quot;.&quot;, &quot;-&quot; and &quot;_&quot;.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repo-desc">Description (optional)</Label>
            <Input
              id="repo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              className="bg-[#0d1117] border-[#30363d] text-[#e6edf3] placeholder:text-[#6e7681]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              checked={initReadme}
              onCheckedChange={(v) => setInitReadme(v === true)}
              className="border-[#30363d]"
            />
            Initialize this repository with a README
          </label>
          {error ? (
            <p role="alert" className="text-sm text-[#f85149] rounded-md border border-[#f85149]/40 bg-[#f85149]/10 px-3 py-2">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="submit"
              disabled={creating || !name.trim()}
              className="bg-[#238636] hover:bg-[#2ea043] text-white w-full sm:w-auto"
            >
              {creating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Create repository
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

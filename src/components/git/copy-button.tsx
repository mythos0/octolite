"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={label ? "sm" : "icon"}
      onClick={copy}
      aria-label={label ? `Copy ${label}` : "Copy to clipboard"}
      className={cn(
        "border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d] hover:text-white",
        className
      )}
    >
      {copied ? <Check className="size-3.5 text-[#3fb950]" /> : <Copy className="size-3.5" />}
      {label ? <span className="text-xs">{copied ? "Copied!" : label}</span> : null}
    </Button>
  );
}

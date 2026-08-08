"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export function CopyLinkButton({ label = "Copy shareable link" }: { label?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.show({ variant: "success", message: "Link copied." });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={copy} className="btn-primary">
      {copied ? <Check size={14} strokeWidth={1.8} /> : <Copy size={14} strokeWidth={1.8} />}
      {copied ? "Copied" : label}
    </button>
  );
}

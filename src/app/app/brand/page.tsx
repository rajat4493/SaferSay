"use client";

import { Upload } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";

export default function BrandPage() {
  const { brand, setBrand, resetBrand } = useBrand();

  function uploadLogo(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBrand({ ...brand, logoDataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  return (
    <AppShell title="Brand" subtitle="Workspace name, tagline, and logo. Colors and layout are fixed across every SaferSay workspace.">
      <Card>
        <h2 className="section-title">Workspace identity</h2>
        <div className="mt-4 grid gap-4 max-w-md">
          <label className="label-text">
            Workspace name
            <input
              value={brand.name}
              onChange={(event) => setBrand({ ...brand, name: event.target.value })}
              className="mt-2 admin-input normal-case"
            />
          </label>
          <label className="label-text">
            Tagline
            <input
              value={brand.tagline}
              onChange={(event) => setBrand({ ...brand, tagline: event.target.value })}
              className="mt-2 admin-input normal-case"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-white px-4 py-6 text-sm font-medium text-[var(--ink-mid)] transition hover:border-[var(--border-hover)] hover:text-[var(--ink)]">
            <Upload size={16} strokeWidth={1.8} />
            Upload logo
            <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadLogo(event.target.files?.[0])} />
          </label>
        </div>
      </Card>

      <Card className="mt-[9px]">
        <h2 className="section-title">Preview</h2>
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-4">
          <BrandMark size={40} />
          <div>
            <div className="text-[14px] font-semibold text-[var(--ink)]">{brand.name}</div>
            <div className="text-[13px] text-[var(--ink-soft)]">{brand.tagline}</div>
          </div>
        </div>
        <button onClick={resetBrand} className="btn-secondary mt-4">
          Reset to SaferSay
        </button>
      </Card>
    </AppShell>
  );
}

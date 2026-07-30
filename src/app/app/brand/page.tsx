"use client";

import { Upload } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";
import { presetThemes } from "@/lib/brand";

export default function BrandPage() {
  const { brand, setBrand, resetBrand } = useBrand();

  function updateColor(key: keyof typeof brand.colors, value: string) {
    setBrand({ ...brand, colors: { ...brand.colors, [key]: value } });
  }

  function uploadLogo(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setBrand({
        ...brand,
        logoDataUrl: dataUrl,
        colors: presetThemes.Violet,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <AppShell title="Brand Studio" subtitle="One place to rebrand SaferSay for your company or for a client instance.">
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <h2 className="text-xl font-semibold">Instance identity</h2>
          <div className="mt-5 grid gap-4">
            <label className="text-sm font-semibold">
              Product / client name
              <input value={brand.name} onChange={(event) => setBrand({ ...brand, name: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-4 py-3 outline-none" />
            </label>
            <label className="text-sm font-semibold">
              Tagline
              <input value={brand.tagline} onChange={(event) => setBrand({ ...brand, tagline: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-4 py-3 outline-none" />
            </label>
            <label className="text-sm font-semibold">
              Font
              <select value={brand.font} onChange={(event) => setBrand({ ...brand, font: event.target.value as typeof brand.font })} className="mt-2 w-full rounded-2xl border border-[var(--brand-border)] bg-white px-4 py-3 outline-none">
                <option>Geist</option>
                <option>Inter</option>
                <option>System</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--brand-border)] bg-white px-4 py-5 text-sm font-semibold">
              <Upload size={17} />
              Upload logo
              <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadLogo(event.target.files?.[0])} />
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Theme</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(presetThemes).map(([name, colors]) => (
              <button key={name} onClick={() => setBrand({ ...brand, colors })} className="rounded-2xl border border-[var(--brand-border)] bg-white p-3 text-left text-sm font-semibold">
                <div className="mb-3 flex gap-1">
                  <span className="h-5 w-5 rounded-full" style={{ background: colors.ink }} />
                  <span className="h-5 w-5 rounded-full" style={{ background: colors.accent }} />
                  <span className="h-5 w-5 rounded-full" style={{ background: colors.background }} />
                </div>
                {name}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(Object.keys(brand.colors) as Array<keyof typeof brand.colors>).map((key) => (
              <label key={key} className="text-sm font-semibold capitalize">
                {key}
                <div className="mt-2 flex rounded-2xl border border-[var(--brand-border)] bg-white p-2">
                  <input type="color" value={brand.colors[key]} onChange={(event) => updateColor(key, event.target.value)} className="h-10 w-12 border-0 bg-transparent" />
                  <input value={brand.colors[key]} onChange={(event) => updateColor(key, event.target.value)} className="min-w-0 flex-1 px-2 text-sm outline-none" />
                </div>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-xl font-semibold">Live preview</h2>
        <div className="mt-4 flex items-center justify-between rounded-3xl bg-[var(--brand-bg)] p-5">
          <div className="flex items-center gap-3">
            <BrandMark size={48} />
            <div>
              <div className="text-xl font-semibold">{brand.name}</div>
              <div className="text-sm text-[var(--brand-muted)]">{brand.tagline}</div>
            </div>
          </div>
          <button className="rounded-full bg-[var(--brand-accent)] px-5 py-3 text-sm font-semibold text-white">Launch survey</button>
        </div>
        <button onClick={resetBrand} className="mt-4 rounded-full border border-[var(--brand-border)] bg-white px-5 py-3 text-sm font-semibold">Reset to SaferSay</button>
      </Card>
    </AppShell>
  );
}

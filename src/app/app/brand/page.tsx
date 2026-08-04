"use client";

import { Check, Upload } from "lucide-react";
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
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">
              Product / client name
              <input value={brand.name} onChange={(event) => setBrand({ ...brand, name: event.target.value })} className="mt-2 w-full rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-4 py-3 text-sm font-medium normal-case text-[var(--brand-ink)] outline-none transition focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent-soft)]" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">
              Tagline
              <input value={brand.tagline} onChange={(event) => setBrand({ ...brand, tagline: event.target.value })} className="mt-2 w-full rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-4 py-3 text-sm font-medium normal-case text-[var(--brand-ink)] outline-none transition focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent-soft)]" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">
              Font
              <select value={brand.font} onChange={(event) => setBrand({ ...brand, font: event.target.value as typeof brand.font })} className="mt-2 w-full rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-4 py-3 text-sm font-medium normal-case text-[var(--brand-ink)] outline-none transition focus:border-[var(--brand-accent)]">
                <option>Geist</option>
                <option>Inter</option>
                <option>System</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--brand-border)] bg-white px-4 py-6 text-sm font-semibold text-[var(--brand-muted)] transition hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]">
              <Upload size={17} />
              Upload logo
              <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadLogo(event.target.files?.[0])} />
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Theme</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(presetThemes).map(([name, colors]) => {
              const selected = JSON.stringify(colors) === JSON.stringify(brand.colors);
              return (
                <button
                  key={name}
                  onClick={() => setBrand({ ...brand, colors })}
                  className={`relative rounded-[var(--radius-card)] border p-3 text-left text-sm font-semibold transition ${
                    selected ? "border-[var(--brand-accent)] bg-[var(--brand-accent-soft)]" : "border-[var(--brand-border)] bg-white hover:border-[var(--brand-accent)]"
                  }`}
                >
                  {selected ? (
                    <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[var(--brand-accent)] text-white">
                      <Check size={12} />
                    </span>
                  ) : null}
                  <div className="mb-3 flex gap-1.5">
                    <span className="h-5 w-5 rounded-full ring-1 ring-black/5" style={{ background: colors.ink }} />
                    <span className="h-5 w-5 rounded-full ring-1 ring-black/5" style={{ background: colors.accent }} />
                    <span className="h-5 w-5 rounded-full ring-1 ring-black/5" style={{ background: colors.background }} />
                  </div>
                  {name}
                </button>
              );
            })}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(Object.keys(brand.colors) as Array<keyof typeof brand.colors>).map((key) => (
              <label key={key} className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">
                {key}
                <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white p-2 transition focus-within:border-[var(--brand-accent)]">
                  <input type="color" value={brand.colors[key]} onChange={(event) => updateColor(key, event.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded-full border-0 bg-transparent" />
                  <input value={brand.colors[key]} onChange={(event) => updateColor(key, event.target.value)} className="min-w-0 flex-1 px-1 text-sm font-mono normal-case text-[var(--brand-ink)] outline-none" />
                </div>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-xl font-semibold">Live preview</h2>
        <div className="mt-4 rounded-[var(--radius-shell)] bg-[var(--brand-ink)] p-6">
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] bg-[var(--brand-bg)] p-5 shadow-[var(--shadow-elevated)]">
            <div className="flex items-center gap-3">
              <BrandMark size={48} />
              <div>
                <div className="text-xl font-semibold">{brand.name}</div>
                <div className="text-sm text-[var(--brand-muted)]">{brand.tagline}</div>
              </div>
            </div>
            <button className="rounded-[var(--radius-pill)] bg-[var(--brand-accent)] px-5 py-3 text-sm font-semibold text-white">Launch survey</button>
          </div>
        </div>
        <button onClick={resetBrand} className="mt-4 rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]">Reset to SaferSay</button>
      </Card>
    </AppShell>
  );
}

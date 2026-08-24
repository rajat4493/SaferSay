"use client";

import { Upload } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";
import { brandFontOptions } from "@/lib/brand";
import { isValidHexColor } from "@/lib/brandTheme";
import { BRAND_PRESETS } from "@/lib/brandPresets";

export default function BrandPage() {
  const { brand, setBrand, resetBrand } = useBrand();

  function applyPreset(presetId: string | null) {
    const preset = BRAND_PRESETS.find((candidate) => candidate.id === presetId) ?? null;
    setBrand({
      ...brand,
      presetId,
      accentColor: preset?.accentColor ?? null,
      fontFamily: preset?.fontFamily ?? null,
    });
  }

  function uploadLogo(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBrand({ ...brand, logoDataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  return (
    <AppShell title="Brand" subtitle="Workspace name, tagline, logo, accent color, and font -- shown to your team and to respondents taking your surveys.">
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
        <h2 className="section-title">Style preset</h2>
        <p className="mt-1.5 secondary-text">
          An optional starting point for colors, shape, and shadows -- still fully editable below afterward. Applies to your workspace admin app and the surveys your employees take.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => applyPreset(null)}
            aria-pressed={!brand.presetId}
            className={`flex items-center gap-2 rounded-[var(--radius-card)] border px-3 py-2 text-[13px] font-medium transition ${
              !brand.presetId ? "border-[var(--green)] bg-[var(--green-bg)] text-[var(--green)]" : "border-[var(--border)] text-[var(--ink-mid)] hover:border-[var(--border-hover)]"
            }`}
          >
            <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)]" style={{ background: "#0d4f37" }} aria-hidden="true" />
            SaferSay default
          </button>
          {BRAND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              aria-pressed={brand.presetId === preset.id}
              title={preset.description}
              className={`flex items-center gap-2 rounded-[var(--radius-card)] border px-3 py-2 text-[13px] font-medium transition ${
                brand.presetId === preset.id ? "border-[var(--green)] bg-[var(--green-bg)] text-[var(--green)]" : "border-[var(--border)] text-[var(--ink-mid)] hover:border-[var(--border-hover)]"
              }`}
            >
              <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)]" style={{ background: preset.accentColor }} aria-hidden="true" />
              {preset.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-[9px]">
        <h2 className="section-title">Colors and font</h2>
        <p className="mt-1.5 secondary-text">
          Applies to your workspace admin app and the surveys your employees take -- not SaferSay&apos;s own console.
        </p>
        <div className="mt-4 grid gap-4 max-w-md">
          <label className="label-text">
            Accent color
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={isValidHexColor(brand.accentColor ?? "") ? brand.accentColor! : "#0d4f37"}
                onChange={(event) => setBrand({ ...brand, accentColor: event.target.value })}
                aria-label="Accent color picker"
                className="h-9 w-9 shrink-0 cursor-pointer rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-0.5"
              />
              <input
                value={brand.accentColor ?? ""}
                onChange={(event) => setBrand({ ...brand, accentColor: event.target.value || null })}
                placeholder="#0d4f37 (default)"
                aria-label="Accent color hex value"
                className="admin-input normal-case flex-1"
              />
              {brand.accentColor ? (
                <button onClick={() => setBrand({ ...brand, accentColor: null })} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                  Reset
                </button>
              ) : null}
            </div>
          </label>
          <label className="label-text">
            Font
            <select
              value={brand.fontFamily ?? ""}
              onChange={(event) => setBrand({ ...brand, fontFamily: event.target.value || null })}
              className="mt-2 admin-input normal-case"
            >
              <option value="">Default</option>
              {brandFontOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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

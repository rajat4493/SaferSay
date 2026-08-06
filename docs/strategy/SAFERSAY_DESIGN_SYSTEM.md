# SAFERSAY — DESIGN SYSTEM

**For:** Claude Code
**Purpose:** Apply the approved visual direction consistently across the whole app. Derived from the approved admin-home mockup. This is the single source of truth for look & feel — replace ad-hoc styling with these tokens and components.

**The identity in one line:** *the calm, trustworthy, sealed one — in a market of blue "engagement" dashboards.* Every competitor leads with "powerful / insightful / engaging." SaferSay owns **safe**. Warm-but-serious, never cute, never enterprise-dense.

---

## 1. DESIGN TOKENS

### Color (CSS variables)
```
--bg:          #FBFAF7;  /* warm paper background */
--surface:     #FFFFFF;  /* cards, panels */
--ink:         #16241F;  /* primary text (warm near-black, not #000) */
--ink-soft:    #5F6E68;  /* secondary text */
--ink-faint:   #8A968F;  /* labels, meta, captions */
--line:        #EAE6DD;  /* borders */
--line-soft:   #F1EEE7;  /* subtle dividers, hover fills */
--primary:     #0E6E59;  /* pine-green: trust/safe. Primary actions, active nav */
--primary-deep:#0A5344;  /* hover, emphasis text on soft */
--primary-soft:#E7F1ED;  /* active nav bg, tags, soft surfaces */
--amber:       #B4701F;  /* attention / the action-loop nudge ONLY */
--amber-soft:  #F8EEDD;
```
Rules: green is the trust identity — use with restraint (actions, active state, the seal), not everywhere. Amber is reserved strictly for the close-the-loop nudge and "needs attention" states — never decorative. No other accent colors. No gradients except the subtle green progress fill and the seal strip's soft wash.

### Typography
- **Display:** `Bricolage Grotesque` (600, 700). Warm, characterful, human-but-serious. Headings, big numbers, the wordmark. Used with restraint.
- **Body / UI:** `Inter` (400, 450, 500, 600). All UI text, labels, paragraphs.
- **Scale:**
  - Page title (h1): 30px / weight 600 / letter-spacing -.025em
  - Section title (h2): 21px / 600 / -.02em
  - Big number (stat/value): 27px / 700 / -.02em (Bricolage)
  - Body: 14px / 450 / line-height 1.5
  - Small: 12.5–13px
  - Micro label: 11–12px / 600 / uppercase / letter-spacing .06em / --ink-faint
- Antialiased; `letter-spacing:-.02em` on all Bricolage.

### Shape, shadow, spacing
- Radii: cards 16px · small cards/inputs 11px · buttons 10px · pills 100px.
- Shadows: `--shadow-sm: 0 1px 2px rgba(22,36,31,.04)` (resting cards) · `--shadow-md: 0 12px 30px -18px rgba(22,36,31,.28)` (hover lift).
- Spacing scale: 4 / 8 / 14 / 16 / 22 / 26 / 34 / 38. Generous. Whitespace is the primary anti-clutter tool.

---

## 2. COMPONENTS

- **Sidebar nav:** white, 1px right border. Items: icon + label, 10px radius. Active = `--primary-soft` bg + `--primary-deep` text + primary-stroked icon. Hover = `--line-soft`. Section labels in micro-label style. Workspace switcher pinned at bottom.
- **Topbar:** sticky, translucent (`backdrop-filter:blur(8px)`), thin bottom divider. Breadcrumb left, help + avatar right.
- **Buttons:**
  - Primary: `--primary` bg, white text, subtle green shadow, hover → `--primary-deep` + 1px lift.
  - Ghost: white bg, `--line` border, `--ink-soft` text; hover → `--line-soft`.
  - Amber: `--amber` bg, white — the loop/attention action only.
  - All: 10px radius, weight 500, 13.5px, icon optional (16px, stroke 1.9).
- **Cards:** white, `--line` border, `--shadow-sm`; hover → `--shadow-md` + 2px lift.
- **Status card:** micro-label + icon → big number (Bricolage) → one meta line. Max 3 per row. Positive meta uses `--primary-deep`.
- **Tag/pill:** `--primary-soft` bg, `--primary-deep` text, 100px radius. "Live" variant includes an animated pulse dot.
- **Progress bar:** 8px, `--line-soft` track, green gradient fill.

### Signature component — the Confidentiality Seal strip
The one memorable element. Soft green wash, shield-check icon in a white tile, honest copy, a "How it works" verify link. Appears on Home and above every report. Copy pattern:
> **Sealed by design** — You'll see the numbers, never the names — and neither can we. Answers can't be traced back to a person.

This is the identity. Do not water it down, do not make it generic ("Your data is secure"). The specific, honest "neither can we / never the names" phrasing IS the differentiator.

---

## 3. PER-SURFACE DIRECTION (different jobs, different energy)

- **Admin app — Tally-clean restraint.** Calm, spacious, ONE primary action per view. Guided: every screen says where you are and the next step. This is the fix for "cluttered/confusing." Max ~3 focal elements per screen.
- **Survey-taker (`/s/[token]`) — Typeform calm.** One question per screen, warm, focused, minimal chrome, generous space, progress bar. The confidentiality screen appears before Q1. Calm = safe; this is the MOST restrained surface. Never gamified — flashy undermines trust.
- **Reports — Maze/Lyssna clarity.** Data-forward but legible and airy. Board-ready, screenshot-ready, carries the tenant's brand. The seal strip sits above results. Accurate, self-explanatory labels (a wrong label destroys trust).
- **Landing (pre-login) — expressive shopfront.** The one place a heavier flourish is allowed. Lead with specific founder-moment copy ("Just crossed 30 people and don't know how your team really feels?"), not "employee engagement."
- **Warmth register throughout:** human and people-centered (Leapsome-warm), never cold-enterprise (Peakon/Qualtrics) and never juvenile (Officevibe-cute).

---

## 4. MOTION & PERFORMANCE GUARDRAILS

- No WebGL, no 3D, no GSAP, no heavy animation libraries.
- Motion = CSS transitions / light only, all ≤ 250ms. Micro-interactions only (hover lift, the live pulse, smooth question transitions). One memorable moment max per surface.
- Respect `prefers-reduced-motion` (disable all animation).
- One variable webfont pair (Bricolage + Inter), subset. Target Lighthouse ≥ 90 mobile. The taker flow must be fast on a mid-range phone.

---

## 5. WRITING (copy is design material)

- User-side language: name things by what people control, not how the system is built ("People," not "identity records").
- Active voice; a button says what happens ("Share an update," "Nudge the 13 who haven't"); the action keeps its name through the flow.
- Honest confidentiality copy — "never the names, and neither can we" — not vague "secure."
- Errors: direct, no apology, say what happened and how to fix it. Empty states: an invitation to act, not decoration.
- Sentence case, plain verbs, no filler.

---

## 6. ACCESSIBILITY FLOOR (non-negotiable)

- Visible keyboard focus (`:focus-visible` ring in `--primary`, 2px offset).
- Contrast meets WCAG AA (the ink/primary values above are compliant on white/paper).
- Fully responsive down to mobile (sidebar collapses; single-column cards).
- Reduced motion respected.

---

## 7. HOW TO APPLY

1. Put the tokens (§1) in the global stylesheet / Tailwind config as the single source.
2. Refactor existing components to the specs in §2 — remove ad-hoc colors/spacing.
3. Apply the per-surface energy (§3): admin restrained, taker calm, reports legible, landing expressive.
4. Add the Confidentiality Seal component and place it on Home + above reports.
5. Verify guardrails (§4) and accessibility (§6) hold.

*The approved admin-home mockup is the reference implementation for tokens and components. Build the rest of the app to match it. Spend boldness on the seal and the confidentiality identity; keep everything else quiet and disciplined.*

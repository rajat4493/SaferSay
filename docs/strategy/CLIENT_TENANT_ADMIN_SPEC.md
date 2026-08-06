# SAFERSAY — CLIENT / TENANT ADMIN SPEC (PHASE 2)

**For:** Claude Code
**Focus:** The Client layer — the customer company's own admin experience. This is what a paying founder/HR lead uses to run surveys. Phase 1 (Owner/platform console) is done; this is the next level down.
**Pattern:** Clean, guided SaaS app. HR-friendly, adoption-first. Some surfaces already exist (partly built) — bring them to this spec and fill the gaps.

---

## 0. WHAT THIS IS

The tenant admin command centre — scoped entirely to ONE customer company. The tenant Admin runs the whole survey lifecycle here: add people → create survey → send invites → read safe reports → close the loop.

**v1 role cut:** ONE admin role (Workspace Admin = Admin capability × Org scope) + Employee (respond only). Managers/Department Heads/CXO are deferred (v1.1) — but reporting is built scope-parameterised now (see §6) so they slot in later without a rewrite.

**The hard confidentiality rule for this entire layer:**
> Even the tenant Admin sees AGGREGATES ONLY (≥ the tenant's min_group_size), NEVER individual responses. Participation ("who has responded") is visible for reminders, but is severed from answer content and can never be joined to it.

**Adoption-first (from real People-team feedback):** simple, guided, expose only what's needed. A non-technical HR person must always know where to start and what each page does. Do not reproduce a complex legacy platform.

---

## 1. LAYOUT & NAVIGATION

Left nav, HR-friendly labels (already chosen):
- **Home** (guided cockpit / first-run)
- **People** (employees + import)
- **Create survey** (templates → launch)
- **Invites** (send + track participation + reminders)
- **Reports** (safe aggregate results + action loop)
- **Go-live** (readiness checks)
- **Settings** (confidentiality threshold, branding, plan, billing)
- **Security** (confidentiality transparency page)

Top bar: tenant brand/logo, workspace name, admin account menu. Aesthetic: the calm "app" register — typography-led, clean, generous space, CSS-only micro-interactions. Not the expressive shopfront; not flashy. Calm signals trust.

---

## 2. HOME (guided cockpit / first-run)

Already partly built (0.1.15). Keep and align:
- First-run tells the admin exactly where to start: **load people → create survey → send invites → read reports.**
- Shows current state at a glance: # employees loaded, active/draft survey, responses so far (count + rate), next action.
- Each step links forward. Once set up, Home is a status dashboard for the tenant's own activity (counts and rates only — never answers).

---

## 3. PEOPLE (employee management + import)

The tenant's identity store, admin-facing.

- **Employee list:** name, email, team/department, manager (from manager_email), location, status (active/inactive). Searchable.
- **CSV import (production-backed — HIGH PRIORITY, see §11):**
  - Upload → parse → **preview/mapping screen** (map columns; show what will import) → confirm → write to identity store, tenant-scoped.
  - Columns: `name, email, team/department, manager_email, location`. (`manager_email` captured now, used for Manager scope in v1.1.)
  - Handle real-world mess: dedupe duplicate emails, reject malformed rows with a clear message (don't fail the whole batch), reject empty/garbage files.
  - Mark imported employees "active" so cycle creation issues their tokens.
  - "Use sample CSV" option retained so a non-technical user can test the flow without preparing a file.
- Add/edit/deactivate individuals manually.
- This is identity data — never shows answers.

---

## 4. CREATE SURVEY (templates → launch)

Already partly built (0.1.9 server-side cycle creation). Bring to spec:
- **Template library:** Engagement Check, eNPS Pulse, Team Health, Onboarding Check-In. Each capped at ~8–10 questions / ~5 min (length discipline — long surveys kill completion and corrupt data).
- **Template detail/preview:** description, constructs, question types, questions.
- **Create cycle:** select template → template upserted → tenant-scoped draft cycle → set survey window (open/close dates) → one server-side hashed token per active employee (DB uniqueness guard against duplicates — built).
- **Survey builder editing/reordering:** later enhancement; not v1-critical.

---

## 5. INVITES & PARTICIPATION (Resend — HIGHEST PRIORITY, gates the live cycle)

This is the missing piece between "prepared cycle" and "real company runs a real survey." Build this next.

- **Send invites via Resend:** each active employee gets their unique token link. From the tenant's verified sender.
- **Reminders:** to non-responders — firing off the **participation store ONLY**, never linkable to answers. (The severance makes this safe by construction.)
- **Participation tracking:** admin sees who has/hasn't responded (for reminders) — this is participation state, SEVERED from answer content. Admin sees "17 of 30 responded," never what any of the 17 said.
- **Scheduling:** invites/reminders respect the survey window.

**Guardrail:** the reminder system may know who submitted; that knowledge must be cryptographically severed from response content — no join possible. Reminders read unspent tokens from participation only.

---

## 6. REPORTS (safe aggregate results + action loop)

- **Aggregate results only**, with **k-enforcement** at the tenant's min_group_size. No segment/report renders below threshold; sub-threshold cells suppressed/rolled up.
- **Scope-parameterised NOW, ship Org scope only in v1.** Report query takes a scope (Org / Department / Team / Self); v1 always passes Org. This makes Manager/Dept-Head views a config addition later, not a reporting rewrite. DO NOT build reports as "admin sees everything."
- **Accuracy & labels are a first-class feature:** correct, self-explanatory metric labels and definitions. A wrong/confusing label destroys trust in the whole tool.
- **Board-ready output:** clean, premium, the customer's brand — the thing a founder screenshots into a leadership deck. Export CSV + PDF; data always exportable, never paywalled.
- **Executive-legible summary view:** the few numbers a leader needs, clearly defined.
- **Static is fine for v1;** interactivity is a later enhancement (People team confirmed this).
- **The action loop:** one-click "share score back to team + commit to one change." This is the #2 trust driver in the research — build it into the report flow. It is a simple human-in-the-flow feature (share the number, name one action), NOT AI.

**No AI-generated dashboards / no psychological inference in v1** (shiny pull + EU AI Act line on employee inference).

---

## 7. SETTINGS

- **Confidentiality threshold:** `min_group_size` — adjustable within a safe band, default 5, **hard floor 3, cannot go to 1** (below floor stops being confidential). The tenant tunes; they can never disable the wall.
- **Branding:** logo, name, theme (shallow customization only — the Brand Studio; do not expand it into structural customization).
- **Plan & features:** read-only view of what their plan includes (feature enablement is controlled by the Owner console).
- **Data export & deletion:** export everything anytime; GDPR deletion controls.

---

## 8. SECURITY (confidentiality transparency page)

Already reworked. Keep clear for HR/DPO/architecture review. Explains, plainly:
- identity store vs response store (severed, no join)
- minimum group size (k)
- reminder isolation (participation only)
- payment isolation
- no emotion/psychological inference
- links to go-live readiness, privacy notice, DPA
This page is a SELLING POINT ("passes security review by design"), not just compliance. Make it legible to a non-technical buyer and a technical reviewer both.

---

## 9. BILLING (Stripe)

- Flat per-cycle (~£200) + data floor (~£15/mo, retains history).
- **One-click cancel; no auto-renew trap; credits/history handling honest.** (Inverts SurveyMonkey's cardinal sins — a positioning feature.)
- Scaffold now; wire live when Stripe lands. (Credit system is v1.1, not v1 — flat pricing validates willingness-to-pay first.)

---

## 10. CONFIDENTIALITY GUARDRAILS (hold across this whole layer)

1. **Admin sees aggregates ≥k only — never individuals.** The wall is above the admin.
2. **Participation is severed from answers.** "Who responded" (for reminders) can never be joined to "what they said."
3. **Reports scope-parameterised + k-enforced**, never "admin sees everything."
4. **Threshold configurable within a floor (never below 3, never 1).**
5. **Data always exportable, never held hostage.**
6. **No unmask path — ever.** Attributable feedback = a separate Identified-Survey product (future), never a toggle on confidential mode.

---

## 11. BUILD ORDER (this layer)

Ordered by what unblocks a real live cycle — the only milestone that matters.

1. **CSV production import** (§3) — parser → preview/mapping → dedupe/error handling → tenant-scoped write → active-flag for token issuance. *Unblocks real employees in.*
2. **Invites & reminders via Resend** (§5) — token links out, reminders off participation only. *Unblocks reaching employees. After this + CSV, a real company can run a real cycle.*
3. **Reports to spec** (§6) — k-enforced, scope-parameterised (Org), accurate labels, board-ready, action loop.
4. **Stripe billing** (§9) — so the design partner can pay after seeing value.
5. **Settings** (§7) — threshold control, export/deletion.
6. Polish: People-team-aligned guidance, survey builder editing (later).

**After steps 1–2, STOP and run a real cycle with a design-partner company.** That is the validation gate. Everything after is informed by what a real customer does.

---

## 12. DESIGN NOTES

- Calm "app" register: typography-led, clean tables, generous space, CSS-only micro-interaction. No WebGL/3D/GSAP.
- Ruthlessly minimal per-role views — expose only what the admin needs.
- The survey-taker experience (`/s/[token]`) is a SEPARATE, even-more-restrained surface (the End-User layer, spec'd next) — calm, mobile-first, one question per screen, honest confidentiality screen before Q1. Do not gamify it; flashy undermines trust.

*This layer is where revenue happens — it's the surface the buyer touches. Build CSV + Resend first; they are the two features between a prepared cycle and a real company running a real confidential survey. Then validate with a live cycle before building further.*

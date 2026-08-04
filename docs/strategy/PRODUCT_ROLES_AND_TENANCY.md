# PRODUCT_ROLES_AND_TENANCY.md — SaferSay

**For:** Claude Code
**Purpose:** Define the multi-tenant role/permission model AND the design/UX direction so the product is built with the right structure and the right look, instead of guessing.
**Read fully before building. Two parts: (A) Roles & Tenancy, (B) Design & UX Direction.**

---

# PART A — ROLES & TENANCY MODEL

## A0. The core mental model: TWO PLANES

The confusion to avoid: "product owner, buyer company, HR, survey takers, managers" are NOT one hierarchy. They are two separate planes. Keep them apart in the schema and the UI.

- **Platform plane** = SaferSay the company (the operator). Serves many customers.
- **Tenant plane** = one customer company. A fully isolated world with its own users, data, and hierarchy. No tenant can ever see another tenant's anything.

Every table on the tenant plane is scoped by `tenant_id`. Row-level security enforces tenant isolation in addition to the identity/response severance already built.

---

## A1. PLATFORM PLANE — roles

**Platform Owner (the SaferSay operator — you)**
- CAN see: list of tenants, billing/subscription status, system health, aggregate usage metrics (counts, not content).
- CANNOT see: any tenant's survey responses, individual answers, or employee-level data. **Zero read access to response content.**
- This is a hard rule, not a convenience. "Even the vendor cannot read your employees' answers" is a core product claim and selling point. Enforce it at the data layer: the Platform Owner role has no query path to response content.

---

## A2. TENANT PLANE — roles

Defined by **what aggregate each role can see** — never by access to individual answers. The confidentiality wall sits ABOVE every role, including the tenant admin.

| Role | Who (in a 10–60 person company) | Can do | Can see |
|---|---|---|---|
| **Workspace Admin / Owner** | Founder or Head of People who signed up | Manage billing, import/manage employees, create & launch surveys, send invites, configure survey settings | Org-wide **aggregate** reports only. NEVER individual responses, even as admin. |
| **HR / Survey Manager** | HR lead (often the SAME person as Owner at this size) | Create/run surveys, manage employee list, read reports | Org-wide aggregate reports |
| **People Manager / Viewer** | A team lead | Nothing to administer | ONLY their own team's aggregate, and ONLY if that team has ≥5 responses. Below 5 → suppressed/rolled up. |
| **Employee / Respondent** | Everyone surveyed | Receive token link, take survey | Their own submission only. Not necessarily a logged-in user — a token holder. |

### Two rules that make this SaferSay-specific (not a generic RBAC)

1. **No role — not even Workspace Admin — can see individual responses.** All roles see aggregates only, with k ≥ 5 enforced. Standard RBAC gives admins full visibility; here the confidentiality wall is above the admin. This is the product's soul; the role model must enforce it, not just the DB.

2. **Hierarchy comes from the employee CSV, NOT a separate org-chart builder.** The employee import columns are: `name, email, team/department, manager_email`. The `manager_email` field *is* the org chart. A People Manager sees the aggregate for employees whose `manager_email` equals their email. No org-structure UI to build. This keeps onboarding CSV-driven and simple.

---

## A3. SETUP FLOW (how a customer actually runs it, end to end)

1. Founder signs up → creates a **workspace** (tenant) → automatically becomes Workspace Admin.
2. Admin imports employee CSV (`name, email, team, manager_email`) → populates the identity store AND defines the hierarchy in one step.
3. Admin selects a template → creates a survey cycle → server-side tokens issued per active employee (already built).
4. Invites sent via Resend → employees take the survey via token link.
5. Admin reads org-wide aggregate. Managers — IF the admin enables manager views (OFF by default) — see only their team, ≥5.

Manager views are OPTIONAL and OFF by default. Most small companies won't enable them; the founder just wants the org-wide result. Do not force hierarchy setup on companies that don't need it.

---

## A4. THE v1 CUT — build only this first

Do NOT build all four roles for v1. Build **two**:

- **Workspace Admin** (owner + HR + everything, one person).
- **Employee / Respondent** (token holder).

Reasons: at 10–60 people, the founder IS the admin, and there are no separate managers to scope. Two roles run a full real cycle with a design partner.

**Defer to v1.1:** People Manager scoped views (add when a larger customer asks "can my team leads see their own results?"). **Defer further:** HR-as-separate-from-Owner (add when a customer has a real HR person distinct from the founder).

Build the tenancy scoping (`tenant_id` on everything, RLS) NOW — that is foundational and cannot be retrofitted. Build the extra ROLES later. Tenancy is structural; roles are incremental.

---

# PART B — DESIGN & UX DIRECTION

## B0. Design philosophy: cool via CRAFT, not spectacle

The goal is "cool enough that a startup wants it" WITHOUT heavy tech that hurts performance or, worse, undermines trust. Award-site techniques (WebGL, GSAP, 3D, heavy parallax) are BANNED in this product. Premium feel comes from typography, whitespace, restraint, and micro-interactions — all near-zero performance cost.

**Hard performance guardrails:**
- No WebGL, no 3D, no GSAP, no heavy animation libraries.
- One variable webfont maximum (subset it). Prefer system font stack + one display face.
- Motion via CSS transitions or lightweight Framer Motion only. All motion ≤ ~250ms. Respect `prefers-reduced-motion`.
- Target Lighthouse performance ≥ 90 on mobile. The survey-taker flow especially must be fast on a mid-range phone.

## B1. The three-surface split (different surfaces, different energy)

1. **Marketing / landing page — expressive.** This is the shopfront for the founder buyer. Allowed: a bold typographic hero, ONE tasteful gradient or motion moment, editorial layout. One heavier flourish is fine (not on the app's critical path). This is where "cool startup" lives.

2. **The app (admin + reports) — calm, fast, premium-minimal.** Craft over spectacle. Clean type, strong grid, generous space, subtle hover/transition states. A board-ready report that a founder screenshots into a leadership deck.

3. **The survey-taker flow — the MOST restrained surface.** Calm, honest, spacious, fast. For a confidentiality product, flashy = suspicious. An employee anxious about whether their boss can see their answers wants clarity and calm, not gamification. Its "premium" is how clean and trustworthy it feels. This is a deliberate rule.

## B2. Concrete design tokens / direction

- **Typography (the hero):** a modern variable grotesque (e.g. General Sans, Inter Tight, or Geist). Real type scale, confident sizes, tight headings. Type-led design is the single biggest premium lever at zero performance cost.
- **Color:** mostly neutral — deep ink / warm off-white — with ONE confident, distinctive accent. Calm, trust-signalling. Avoid gradients inside the app; a tasteful gradient is allowed only on the landing hero.
- **Layout:** generous whitespace, strong grid, editorial spacing. Restraint reads as confidence.
- **Motion:** micro-interactions only — a progress bar that feels alive, smooth one-question-at-a-time transitions, satisfying hover states, ONE memorable reveal moment on the report. Never macro-animation.
- **One memorable detail:** invest craft in the confidentiality moment (the "here's what your employer can and can't see" screen) and the report reveal. These are the two moments that build trust and get shared.

## B3. UX principles (from real People-team feedback)

- **Adoption-first:** the product must feel simple enough that people actually use it. Lead with simplicity, expose only what each role needs.
- **Ruthlessly minimal role views:** admin, manager, employee each see only their slice — nothing more.
- **Report accuracy is a first-class feature:** correct, self-explanatory labels and definitions. A wrong or confusing metric destroys trust in the whole tool.
- **Guided first-run:** tell a non-technical HR user where to start and what each page is for (already partly built).
- **Static reports are fine for v1:** interactivity is a later enhancement. Do not over-build reporting.

## B4. Explicitly NOT to build (design/scope walls)

- No WebGL / 3D / GSAP / heavy animation.
- No gamified or "experiential" survey-taker flow (undermines trust).
- No per-client custom dashboard replication as a product feature (that is a one-client customization, kept separate).
- No AI-generated dashboards in v1 (shiny pull + EU AI Act line on employee inference).

---

## SUMMARY (one line each)

- **Two planes:** platform (you) vs tenant (customer), fully isolated.
- **Platform Owner** sees everything except answers — ever.
- **One Workspace Admin** runs surveys and reads aggregates, never individuals.
- **Managers** (optional, later) see only their team, only ≥5.
- **Employees** just get a link.
- **Hierarchy = the `manager_email` CSV column**, not a builder.
- **v1 = two roles** (Admin + Employee) + tenancy scoping now; more roles later.
- **Design = cool via craft** (type, space, micro-interaction), NOT spectacle; expressive shopfront, calm app, most-restrained taker flow; hard performance guardrails.

*Build the tenancy scoping and the two-role cut first. Fold the design direction in as you build each surface. Flag anything here you believe is wrong before starting.*

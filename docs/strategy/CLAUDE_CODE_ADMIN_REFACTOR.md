# CLAUDE CODE — ADMIN REFACTOR: NAV + CLIENT ROLES (incl. Auditor)

**Goal:** Restructure the Client/Tenant admin from an 8-item enterprise console into a consumer-grade, survey-centric app with three nav zones, and implement the client-side role model (four roles). Reference implementation for look & feel: `admin_rethought_surveys.html` (Ink & Cream). This is a structural refactor + a role/permission model — NOT new features and NOT a confidentiality-architecture change.

**Two parts:** (1) nav restructure, (2) client role/permission model. Do them together.

---

## PART 1 — NAV RESTRUCTURE (survey as the object)

The current admin has ~8 top-level destinations (People, Templates, Create survey, Invites, Reports, Go-live, Settings, Billing, Brand, Security). This reads as an enterprise console — the "overwhelming legacy platform" we must not be. Collapse to **THREE nav zones**, organised around the survey object, not around functions.

### The three zones
1. **Surveys** (home) — the list of surveys. Create new from here. The live survey is the prominent card; past surveys are a quiet list below. Opening a survey is where all per-survey work happens (see below).
2. **People** — the employee list; set up once. Import (CSV), add/deactivate.
3. **Workspace** — the quiet corner: settings (confidentiality threshold), plan & features, billing, confidentiality/security proof, go-live. Owner-gated (see Part 2).

### Move these INSIDE the survey object (stop being top-level nav)
Templates, Create survey, Invites, Reports currently are separate destinations. They become **stages inside a single survey**:
- Open a survey → work through **Build (template + questions) → Send (invites/reminders) → Results (safe report)** as a flow within that survey's page.
- "Templates" becomes the picker inside "New survey," not a standalone destination.
- "Invites" and "Reports" become tabs/sections of the open survey, not global nav items.

This is the Tally/Typeform model: you don't visit a Reports module, you open your survey and read its results there.

### Look & feel
Match `admin_rethought_surveys.html`: Ink & Cream palette, Bricolage display + Inter, warm/calm, one primary action per view, generous whitespace, the "Sealed by design" seal strip. Consumer-grade, not dense.

---

## PART 2 — CLIENT ROLE / PERMISSION MODEL (four roles)

All roles use the SAME three-zone app — they differ only in what they can see/touch. Do not build separate apps.

| Role | Surveys | People | Workspace | Audit & Proof |
|---|---|---|---|---|
| **Customer Admin (owner)** | full (create/run/read) | full | full | view |
| **Survey Creator / Controller** (HR day-to-day) | full (create/run/read) | full | — (hidden) | — |
| **Auditor** | view results only (k-safe aggregate) | — | view (read-only) | full |
| **Employee / Respondent** | — (token link only) | — | — | — |

### Role rules
- **Customer Admin (owner):** the person who signed up. Controls everything — people, surveys, threshold, billing, plan. Sees all zones.
- **Survey Creator/Controller:** does the day-to-day work — creates and runs surveys, manages the employee list. **Workspace is hidden** (no billing, plan, or threshold control). Same app, one fewer zone.
- **Auditor (NEW — read-only, verify-everything):** for a DPO, works-council rep, or external compliance reviewer. Exists to *verify the wall is real and prove it to others* — NOT to use the tool. Can:
  - View the confidentiality architecture / "how it works" proof (severed stores, k-threshold, reminders-read-participation-only, no identity↔answer join).
  - View **audit logs** (operator actions — see the hard rule below).
  - View the same **k-safe aggregate reports** everyone sees (never individuals, never sub-k).
  - View confidentiality **settings as read-only** (current threshold, roll-up rules).
  - CANNOT: run a survey, send invites, add/remove people, change any setting, or see any individual response. Pure read + verify.
- **Employee:** token link only, own submission only. (Unchanged.)

### v1 vs later
- **v1 ships:** Customer Admin (owner) + Employee. (At 10–60 people the owner is the admin; design partners need only these.)
- **Build the permission model + `role` field NOW** so Survey Creator and Auditor are new rows, not a refactor later — same discipline as `manager_email` and scope-parameterised reports.
- **Expose Survey Creator and Auditor roles when a customer asks** (a larger client with separate HR; a regulated client with a DPO/works council).

---

## PART 3 — AUDIT LOGGING (build now, exposed via Auditor role later)

Start recording audit events NOW so the Auditor role isn't a retrofit.

### THE HARD RULE — audit logs must never become a de-anonymisation tool
- Audit logs record **operator ACTIONS on the system**, never respondent participation or content.
- Log: "threshold changed to 5," "invites sent to 30 people," "survey created from Engagement template," "survey closed," "employee list imported (30 rows)," "report exported."
- NEVER log: who responded, who has/hasn't submitted tied to identity in a way an auditor could read, or any response content.
- **If an audit entry would let someone infer that a specific person responded (or what they said), it must not be recorded in the audit log.** Participation state stays in the operational participation store (for reminders only) and is NEVER surfaced to the Auditor role. Logs are about operators, not respondents.
- This is the line that keeps the audit trail from breaking the wall it exists to prove. An auditor with log access must still be unable to identify a single respondent.

### Log fields (safe)
actor (operator role + id), action, timestamp, target object (survey/workspace/people-list), and safe counts. No PII of respondents, no response content, no per-person submission status.

---

## GUARDRAILS

- No confidentiality-architecture change. Severed stores, RLS, k-threshold, roll-up (v1.1) all unchanged.
- No new product features — this is structure + roles + audit logging only.
- Hold the design system (Ink & Cream reference, warm/calm, one primary action, seal strip).
- Accessibility floor: focus-visible, AA contrast, responsive, reduced-motion.
- After: `lint`, `test` (incl. confidentiality tests against real DB — never skip; add a test asserting audit logs contain no respondent identity/content), `build`, deploy.

---

## BUILD ORDER

1. Restructure nav to three zones (Surveys / People / Workspace); move Templates/Create/Invites/Reports inside the survey object.
2. Apply the Ink & Cream design language (match the reference mockup) across the restructured admin.
3. Add the `role` field + permission model for all four roles; gate Workspace to owner; ship owner + employee live, keep Survey Creator + Auditor defined but not yet surfaced.
4. Add audit-event logging (operator actions only) with the de-anonymisation guard + its test.
5. Build the Auditor's "Audit & Proof" read-only view (can be behind a flag until a customer needs it).

*This refactor deletes surfaces rather than adding them — that's the point. Three zones, survey-as-object, roles by what's hidden not by separate apps, and an audit trail that proves the wall without ever breaching it.*

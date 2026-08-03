# Spec: Grievance / Lawful-Disclosure Channel

**Status:** Draft — requires outside employment-law review before any public "confidential" claim covers this feature. This repo cannot verify legal correctness; treat every jurisdiction-specific claim below as a starting hypothesis, not compliance advice.

## Problem

SaferSay's core pitch is "no one — not even an admin — can link a person to their answer" (the severance architecture, `db/migrations/0001_confidential_spine.sql`). That guarantee is correct and should stay absolute for **engagement/pulse survey data** (opinions, eNPS scores).

But companies also have a *legal duty* to investigate and act on reports of harassment (India's POSH Act), discrimination, or financial misconduct (money laundering, fraud) — which requires being able to identify and follow up with a reporter, at least at the investigation-team level, under due process. Building one undifferentiated "anonymous" system that both guarantees perfect anonymity and needs to support lawful investigation is a contradiction that will break trust the first time it's tested, and expose the company to legal risk either way.

The EU Whistleblowing Directive already sets the shape of the correct answer: companies with 50+ workers must provide a reporting channel, anonymous reporting is allowed but not mandated per member state, and even where anonymity isn't guaranteed, **confidentiality of identity must still be protected** — receipt acknowledged within 7 days, investigation outcome communicated within 3 months. GDPR applies throughout, with fines up to 4% of global revenue for mishandling. ([EU Whistleblowing Directive summary](https://whistleblowersoftware.com/en/eu-whistleblowing-directive-summary), [Whistleblowing & GDPR tension](https://www.lawcode.eu/en/blog/whistleblowing-directive-dsgvo-data-protection-notice-system/))

## Design: two structurally separate systems, not one with an exception

| | Engagement Survey (existing) | Grievance Channel (new) |
|---|---|---|
| Purpose | Pulse/eNPS, aggregate sentiment | Harassment, discrimination, misconduct reports |
| Identity guarantee | **Absolute** — architecturally severed, no linkage possible even by admin (`identity` vs `responses` schemas) | **Confidential, not anonymous-by-default** — reporter identity is known to a limited, audited investigation role, protected from retaliation |
| Reporting mode | Always anonymous | Reporter chooses: named, or anonymous-with-optional-reveal |
| Disclosure path | None — never disclosed under any circumstance | Lawful break-glass: dual-approval + audit log, only for legal/investigative purpose |
| Data model | `responses.*` schema, no identity columns (enforced by DB trigger) | New `grievance.*` schema — deliberately **not** part of the severance guarantee, clearly labeled as such in-product |

**Critical UX/legal requirement:** the product must never let a user reasonably believe grievance reports carry the same absolute-anonymity guarantee as pulse surveys. This needs its own consent screen, its own visual language, and its own entry point — not a toggle inside the engagement survey flow.

## Break-glass disclosure flow (for named or opted-in reports only)

1. Report submitted via grievance channel → stored in `grievance.reports` with reporter identity, timestamp, category (harassment/POSH, discrimination, financial misconduct, other).
2. Only a designated "impartial investigator" role (new `role` value, not `owner`/`admin`/`employee`) can view report contents — enforced at the repository layer, not just UI.
3. Any access to a report is written to an append-only `grievance.access_log` (actor, timestamp, report id, reason) — this is the audit-log capability already listed as missing in `PRODUCT_GAPS.md` item 10, and is a hard prerequisite for this feature, not optional polish.
4. Escalation/disclosure beyond the investigator role (e.g., to legal counsel, law enforcement) requires a second, distinct approver (dual control) and is itself logged with the lawful basis recorded (e.g., "regulatory request," "POSH Act internal committee referral").
5. Reporter receives a status update within a configurable SLA (default 7 days acknowledgment, matching the EU directive reference point above) — even if the underlying jurisdiction doesn't mandate it, it's a reasonable default.

## Non-goals for v1

- Do not attempt anonymous-with-later-reveal cryptographic schemes (e.g., reporter-held reveal keys) — too complex for a v1, and the dual-control audit-logged access model covers the realistic threat model for a 10–60 person company.
- Do not build jurisdiction-specific compliance logic (India POSH committee composition rules, EU per-member-state anonymity rules) into the product yet — ship the structural separation and audit trail first; jurisdiction-specific workflow templates are a later layer once a lawyer has reviewed the base model.

## Dependencies

- Audit log infrastructure (`PRODUCT_GAPS.md` #10) — build this as part of this feature, not before it, since the grievance channel is what makes it non-optional.
- Role/access matrix (`PRODUCT_GAPS.md` #5) — the "investigator" role needs to exist before this ships.

## Before shipping

- [ ] Outside employment-law review (start with EU, since `DATA_RESIDENCY_REGION=EU` is already the default) covering: is anonymous submission required or merely permitted in target markets, retention period for grievance records, mandatory reporting timelines.
- [ ] Legal copy review for the consent screen — must not overstate or understate the protection actually provided.

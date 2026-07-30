# PROJECT BUILD BRIEF — Confidential Employee Survey Platform (working name: TBD)

**Audience:** Codex (autonomous coding agent)
**Author:** Product owner (Rajat)
**Status:** Pre-build. This is the founding brief. Read it fully before writing any code.
**Last updated:** 30 July 2026

---

## 0. INSTRUCTION TO CODEX — READ FIRST, DO NOT SKIP

You are being asked to build a product, not just implement a spec. Before you plan or code:

**STEP 1 — DEEP RESEARCH (do this first, produce a written findings doc):**

Research each of the following and summarise what you learn into a `RESEARCH_FINDINGS.md` file. Do not start building until this is done and the findings have informed your plan.

1. **Onboarding UX benchmark.** Study how Calendly, Typeform, and Tally achieve "first valuable action in under 10 minutes with zero setup friction." Document the specific patterns (SSO-first signup, template-first not blank-page, progressive disclosure, no-config defaults). We are copying this *feel*.
2. **Confidentiality architecture.** Research how to build a survey system where respondent identity provably cannot be linked to responses, even by a database admin. Look into: severed data stores, one-way hashed submission tokens, k-anonymity / minimum-group-size thresholds, and how reminder systems can chase non-responders WITHOUT being able to link participation to answers. This is the hardest and most important part of the build.
3. **Competitor feature + pricing teardown (current, 2026).** Pull live pricing and feature sets for: Culture Amp, Workday Peakon, Lattice, 15Five, SurveyMonkey, Microsoft Viva Glint, Officevibe/Workleap, Google Forms, and FormGrid. Identify specifically what each does on: anonymity/confidentiality claims, minimum commitment/contract terms, pricing model, and whether they paywall collected data. We are positioning *against* these — know them cold.
4. **Legal/compliance baseline.** Research GDPR requirements for processing employee survey data in the EU, the concept of confidential vs anonymous surveys, and the EU AI Act's treatment of "emotion recognition in the workplace" (this is a prohibited practice — we must never build it). Summarise what a self-serve confidential survey tool must do to be compliant for small EU companies.
5. **Question-bank sourcing.** Research validated, widely-used employee engagement/pulse/eNPS/onboarding question sets so our templates are credible out of the box (e.g. Gallup Q12-style constructs, eNPS methodology). Do not copy proprietary text verbatim — build original, methodologically-grounded question banks.

**STEP 2 — PLAN.** After research, produce a `BUILD_PLAN.md`: your proposed architecture, schema, phased task breakdown, and acceptance criteria per phase, aligned to the scope defined below. Flag anything in this brief you think is wrong or risky.

**STEP 3 — BUILD** in the phase order defined in Section 9. Do not build anything listed in Section 8 (Explicitly Out of Scope for v1).

**Guardrails that override everything else:**
- Never build features that infer the emotional/psychological state of respondents (EU AI Act prohibited).
- Never allow respondent identity to be joined to response content. If a feature requires that join, do not build it — escalate.
- Do not add features not listed in Section 7. Scope creep is the primary risk to this project.

---

## 1. WHAT WE ARE BUILDING (one line)

A self-serve, confidential employee survey tool that a small company can run in under ten minutes, priced pay-per-use with no annual lock-in — Calendly-easy to start, provably confidential by design, and premium in feel.

---

## 2. THE THESIS / WHY THIS EXISTS

Companies spend €3,000–€30,000+ per year on employee engagement platforms (Culture Amp, Peakon, Qualtrics) for what is operationally a twice-a-year survey activity, forced into annual per-seat commitments. Small companies (10–60 employees) are priced out or forced to choose between:

- **Free but useless** (Google Forms, FormGrid) — cannot guarantee confidentiality, no safe segmentation, ugly reports, low trust → low response rates → worthless data.
- **Great but unaffordable/over-committed** (Culture Amp et al.) — annual contracts, per-seat pricing, enterprise procurement.

There is a genuine, empty gap between "free and useless" and "great but €3k/yr committed." We fill it.

---

## 3. THE PROBLEMS WE SOLVE (validated from research)

**Buyer problems:**
- Forced annual commitment for an episodic (2x/year) need.
- Per-seat pricing punishes small teams.
- Collected data held hostage behind paywalls (SurveyMonkey's cardinal sin).
- Auto-renewal traps, no refunds, hard cancellation.
- Procurement friction — a survey should not be an IT project.

**Respondent (survey-taker) problems — these determine data quality:**
- **Distrust of anonymity** → dishonest answers or non-response. Employees fear their employer can trace responses. (The core one.)
- **Length/fatigue** → 60% won't take a survey over 10 min; 70% have abandoned one mid-way. Long surveys corrupt even the answers they collect.
- **"Nothing changes"** → when feedback vanishes into a void, people stop participating. Closing the loop is the #2 trust driver.
- **Bad question design** → confusing/leading questions cause abandonment and dishonesty.

**The market gap:** No tool serving small companies offers *provable* confidentiality. Form builders can't prove it. HR-suite-embedded pulse tools (Deel, Officevibe) are structurally compromised — a survey administered inside the employer's payroll/HR system is the *worst* confidentiality story. The real confidentiality players start at prices small companies won't pay.

---

## 4. TARGET MARKET / ICP (v1)

**Primary:** Companies of **10–60 employees**, in **English-operating EU markets** — Ireland, Netherlands, Nordics, Poland.

Why this precise slice:
- Confidentiality is a *premium purchase* in EU work cultures, not a nice-to-have.
- 10–60 headcount = has the GDPR exposure and confidentiality anxiety, but is usually **below the works-council threshold** (e.g. NL works council mandatory at 50+), so no co-determination procurement wall.
- English-first avoids per-market localisation cost at launch.

**Explicitly not the launch market:** US (crowded, funded, no edge), India/SEA (price-insensitive floor too low — use only as free-tier volume/validation later).

---

## 5. COMPETITIVE POSITIONING (use these as reference points)

| Competitor | What they are | Why we beat them for our ICP |
|---|---|---|
| **Calendly** | (UX role model, not a competitor) | We copy their onboarding ease and premium feel |
| **Google Forms / FormGrid** | Free form builders | Cannot prove confidentiality; no safe segmentation; ugly reports. We beat free on *trust*, never on price |
| **SurveyMonkey** | Generic survey SaaS | Paywalls your own data; auto-renew traps. We invert every one of these |
| **Culture Amp / Peakon / Lattice / 15Five** | Enterprise engagement platforms | Annual per-seat lock-in, €3k+/yr, procurement. We're pay-per-cycle, no commitment |
| **Viva Glint / Officevibe / Deel pulse** | HR-suite-embedded pulse | Bundled (must buy parent tool); embedded-in-employer-system = broken confidentiality story. We are separate and provably can't see identities |

**Our one-line positioning:** "The confidential employee survey your team actually trusts — separate from your HR system, live in ten minutes, pay only when you run it."

---

## 6. THE CORE DIFFERENTIATOR / MOAT

**Confidentiality by construction, not by promise.**

Critical framing (get this right in all copy and architecture): we do NOT claim "100% anonymous." That's a myth the moment SSO exists, and employees know it. We claim what is true and provable:

> **The system knows who you are (via SSO). Your employer never can. Identity and answers are severed by design — we could not reveal who said what even if legally compelled to try.**

This is *confidentiality*, and it is exactly what a small-company employee actually fears — not the vendor, but their own manager seeing their words. Honesty about the limit IS the trust signal.

---

## 7. v1 SCOPE — THE COMPLETE FEATURE LIST (nothing beyond this)

Each item is something Google Forms / a form builder structurally cannot do. If a proposed feature is not on this list, it is not in v1.

1. **SSO onboarding** (Google Workspace + Microsoft 365). Directory import for employee list.
2. **Template-first survey creation** — pick a validated template, survey exists in one click. No blank page.
3. **Provable confidentiality** + a "how this works" screen shown to every respondent before Q1 (what's stored, what the employer can never see).
4. **Safe segmentation** — minimum-group-size ≥ 5 enforced; no segment or demographic filter renders below 5 responses.
5. **Auto start/close scheduling** for survey windows.
6. **Reminders** to non-responders — firing off the participation store ONLY, never linkable to answers.
7. **Data always exportable, never paywalled** (CSV/PDF). Their data is theirs.
8. **No auto-renew trap** — cancel in one click; nothing renews silently.
9. **Validated question banks** (engagement, pulse, eNPS, onboarding) capped at ~8–10 questions / ~5 min.
10. **History retention** (on the paid floor tier) — cycle-two compares to cycle-one.
11. **Action loop** — one-click "share score back to team + commit to one change" built into the report flow.
12. **Premium respondent experience** — mobile-first, one-question-per-screen, progress bar (Typeform-grade feel).
13. **Premium report** — clean, instant, board-ready, customer's logo. The thing they screenshot into a leadership deck.
14. **Flat per-cycle payment** via Stripe (see Section 10).

---

## 8. EXPLICITLY OUT OF SCOPE FOR v1 (do not build — these are the trap)

- **Benchmarks / cross-company comparison** — cold-start problem, needs many tenants' data. v2.
- **AI open-text summarisation** — real and valuable, but v1.1 upsell. Does not create demand.
- **AI recommendations / guidance / playbooks** — v1.1, and must be *curated playbooks*, never freeform AI advice.
- **Any emotion/psychology inference on respondents** — NEVER. EU AI Act prohibited practice.
- **Credit system** — v1.1. v1 uses flat per-cycle pricing to validate willingness-to-pay first.
- **Slack/Teams deep integration** — email + shareable link is enough to launch. v1.1.
- **Continuous pulse / high-frequency cadence** — wrong product shape for our episodic ICP.

---

## 9. ARCHITECTURE

### 9.1 The spine (build first, get it right)

Two **severed data stores**:

- **Store A — Identity/Participation:** SSO user IDs, emails, "who has submitted" flags, reminder targeting. Knows *who*, never *what*.
- **Store B — Responses:** answer content, linked only to a survey cycle and (optionally) coarse segment tags, never to a person.

**No foreign key, no join, no query path** connects a person in Store A to a response in Store B. Enforce at the schema level (separate schemas + row-level security) so it is impossible by construction, not merely by application logic.

- **Deduplication** (one-response-per-person without identity leak): issue a **one-way hashed, single-use submission token** at survey open, tied to the user in Store A. On submit, the response lands in Store B carrying only the *spent* token hash — which cannot be reversed to identity. Reminders check "which tokens are unspent" in Store A only.
- **Min-group-size (≥5)** enforced at the query/reporting layer: no segment renders unless ≥5 responses exist; any filter that would produce a sub-5 cell is suppressed automatically.

This spine is the entire moat and the entire legal claim. Engineer it slowly and correctly. Everything else is quick.

### 9.2 Stack (all already familiar to the owner)

- **Frontend/app:** Next.js 15 on Vercel.
- **DB:** Postgres (Supabase or Neon), Stores A and B as separate schemas, row-level security enforcing severance.
- **Auth:** Auth.js with Google + Microsoft providers.
- **Payments:** Stripe (flat per-cycle checkout in v1).
- **Email/reminders:** Resend.
- **Charts/report:** Recharts or Tremor.

---

## 10. PRICING MODEL

**v1 — flat, to validate willingness-to-pay:**
- **Per-cycle:** ~£200 per survey cycle (Door 2 — the acquisition funnel, lowest-commitment entry).
- **Data floor:** ~£15/mo (~£180/yr) to retain history and keep the account warm (Door 1 — the recurring revenue and the switching cost).
- First cycle free (or free report preview) to let them experience value before paying.

**Sequencing:** Door 2 acquires; Door 1 is the business. The upgrade trigger fires when a returning user wants to compare to their last cycle and hits "your history is retained on the £15 plan."

**v1.1 — credit system** (later, once flat pricing proves people pay): prepaid credits burned per response/action; floor stays separate in cash; captures breakage + upfront cash + larger anchor purchases. Do NOT build in v1.

---

## 11. BUILD SEQUENCE (short-term / phases)

1. **Phase 1 — The severed-data spine + min-5 enforcement.** Hardest, most differentiating. Includes the hashed-token dedup and the impossibility-of-join guarantee. Ship with tests proving no identity↔response join is possible.
2. **Phase 2 — One excellent single-cycle flow:** template → premium mobile respondent experience → board-ready report. This must be visibly better than free on the *first* run, before any history exists.
3. **Phase 3 — SSO onboarding + directory import.** The Calendly-easy "live in 10 minutes" path.
4. **Phase 4 — Scheduling, reminders (off participation store), export.**
5. **Phase 5 — Stripe flat per-cycle + £15 floor.**
6. **STOP. Validation gate.** Get ten ICP companies through the product before building anything else.

---

## 12. LONG-TERM ROADMAP (post-validation)

- **v1.1:** credit system; AI open-text summarisation; curated action playbooks (guidance for the *manager*, never inference on the *employee*); Slack/Teams delivery.
- **v2:** cross-company benchmarks (once enough tenants exist — the one true data moat); deeper driver analytics.
- **Geographic expansion:** India as free-tier volume/validation market; US as phase-two, entering on the anti-incumbent angle (no auto-renew trap, no data paywall, actually-confidential).
- **Enduring moat:** the benchmark dataset (network effect) + the confidentiality architecture (which HR-embedded incumbents structurally cannot replicate).

---

## 13. COMPLIANCE REQUIREMENTS (non-negotiable)

- **GDPR:** lawful basis documented; data minimisation; EU data residency; clear respondent privacy notice; exportable + deletable data.
- **Confidentiality claim must be literally true:** the severed-store architecture must make "your employer cannot identify you" a provable fact, not marketing.
- **EU AI Act:** no emotion recognition, no psychological-state inference on respondents — prohibited practice. AI (later) may only assist the *manager* with curated, evidence-based guidance and open-text theming.
- **Confidentiality vs anonymity:** never use the word "anonymous" in a way that implies the system cannot know identity. Use "confidential" and state the truth plainly.

---

## 14. SUCCESS CRITERIA / VALIDATION GATES

The build is not the risk — acquisition is. Gates:

- **Product gate:** a 30-person company can go from signup to live survey in < 10 minutes, unaided.
- **Trust gate:** a respondent, shown the "how this works" screen, believes their employer can't see their answers.
- **Willingness-to-pay gate (the real one):** ≥ 6 of 10 ICP founders/HR leads, shown the confidentiality pitch, say they'd pay ~£200/cycle over defaulting to a free form or no survey. This is validated *with real conversations*, not assumed.
- **Retention gate:** what fraction keep paying the £15 floor between surveys. This single number separates "side project" from "business" and can only be learned by shipping.

**Income context (why the numbers matter):** literal breakeven is ~2–3 clients (trivial). Meaningful side income ~50 clients. Full income replacement ~185 clients on the floor model. The whole venture reduces to one question: *can zero-touch self-serve acquire ~185 small EU confidentiality-lane companies?* Define the acquisition channel early; it — not the build — decides viability.

---

## 15. NON-NEGOTIABLE PRINCIPLES (pin these)

1. Calendly-easy onboarding beats feature breadth. Premium feel comes from polish on a narrow set, not from more features.
2. The severed-store confidentiality spine is the product. Everything else is packaging.
3. Beat *free* on trust, never on price.
4. Ship the confidential, short, loop-closing, premium-feeling survey — flat £200/cycle — and stop. Validate before adding the shiny layer.
5. Scope creep is the enemy. Section 8 is a wall, not a suggestion.

---

*End of brief. Codex: begin with Section 0, Step 1 (deep research → `RESEARCH_FINDINGS.md`), then Step 2 (`BUILD_PLAN.md`), then build in Section 11 order. Flag anything here you believe is wrong before coding.*

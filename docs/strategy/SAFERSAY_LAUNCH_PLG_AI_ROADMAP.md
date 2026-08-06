# SAFERSAY — LAUNCH, PLG & AI ROADMAP SPEC

**For:** Claude Code + product planning
**Purpose:** The path from live cycle → public launch, the product-led growth engine, and the AI interpretation layer — phased, with hard gates. This is a roadmap, NOT a build-all-now list. Respect the phasing.

---

## 0. THE PHASES AT A GLANCE

| Phase | What it is | Gate to reach it |
|---|---|---|
| **P0 — Live cycle** | One real company runs a real survey, hand-held | Resend account + domain verified (days) |
| **P1 — Public launch** | Any founder can self-serve sign up, run, pay | RLS hardening + SSO + Stripe + landing page (~3–5 sprints) |
| **P2 — PLG-optimised** | The product acquires/retains/expands itself | Shareable report loop, retention hooks live |
| **P3 — AI expansion** | AI interpretation as paid upsell | v1.1; only after P1 validates people pay |

**Do P0 first, always.** It's the validation gate and needs almost nothing. Do NOT jump to P3 (AI) before P1 proves people pay for the core.

---

## 1. LAUNCH GATES — live cycle vs public launch

### P0 — Live cycle (imminent)
- Only gap: **Resend account + domain verification** (start DNS now; propagation lags).
- Temp admin gate is FINE here — design partners are people you know.
- This is NOT public launch. It's the validation gate: 3–5 real companies run real cycles.

### P1 — Public launch (the hard gate is RLS)
Before a stranger can self-serve, ALL of these must be real:
1. **RLS hardening — THE blocker.** DB-enforced tenant isolation (policies + non-superuser role + isolation tests). **You cannot open a multi-tenant app to the public on code-discipline isolation alone.** A cross-tenant leak on day one ends the company. Non-negotiable before public.
2. **Real SSO** (Google + Microsoft) — the temp gate cannot front public signup.
3. **Stripe live** — public = self-serve payment.
4. **Converting landing page** — the PLG front door (see §2).

Order: P0 live cycles now (temp gate OK) → validate → then harden for public. Never public-launch before RLS.

---

## 2. PLG ENGINE — product-led growth mechanics

PLG is mandatory, not optional: at £200/cycle the economics cannot fund a sales team. The product must acquire, retain, and expand itself. The levers, specific to SaferSay:

### 2.1 Time-to-value under 10 minutes, NO gate
- The most important PLG mechanic: the founder experiences value BEFORE paying.
- The "Use sample CSV → live survey → see the report" path is exactly this. Protect it ruthlessly.
- **No signup wall before they see how easy it is. No demo call. No "contact sales."**
- Filter for every feature: usable by one non-technical founder with zero onboarding. If it needs explaining, it's not PLG-ready.

### 2.2 The report is the acquisition loop (the Calendly mechanic, adapted)
- SaferSay's viral loop runs through the REPORT, not the survey link. Employees who take surveys aren't buyers; founders who see reports are.
- Every board-ready report a founder screenshots into a leadership deck or shows an investor is seen by OTHER founders (= buyers).
- **Build for this deliberately:** the report must be beautiful, shareable, and subtly marked ("made with SaferSay"). Make sharing frictionless (clean export, shareable link, PDF). This is the primary acquisition engine.

### 2.3 Employee experience seeds future buyers
- The employees who take a calm, trustworthy survey become future founders / heads of people elsewhere.
- A great taker experience is long-tail acquisition at zero extra cost. This is why the taker flow being excellent is commercial, not just ethical.

### 2.4 Retention = the £15 floor + history
- They return because their last cycle is there to compare against. The switching cost is their own accumulated history.
- Product-led retention: nothing to sell; the data holds them. Make cycle-over-cycle comparison a visible, valued feature.

### 2.5 Expansion = usage, not upsell calls
- More cycles, more employees, credit packs, AI insights (P3) — all self-serve, triggered by the customer's own growth. Never a sales call.

### 2.6 Positioning: SPECIFIC founder moments, not "engagement"
This is the PLG marketing wedge for small customers. Do NOT market "employee engagement" (Culture Amp's framing, wrong buyer). Speak to exact, urgent founder moments:
- "Just grew from 12 to 30 and something feels off but nobody will say it to your face?"
- "Two people quit and you didn't see it coming?"
- "About to raise/restructure — is the team actually with you?"
- "Went remote/hybrid — do you know if people are okay?"

Templates AND the landing page should name these specific moments. The specificity IS the marketing: a founder reads their exact situation and thinks *that's me* — which "engagement platform" never achieves.

---

## 3. AI INTERPRETATION LAYER (P3 / v1.1)

### 3.1 What it is
Connect an LLM (OpenAI / Claude via API) that takes the **already-aggregated, k-safe report data** plus predefined prompts, and generates:
- A plain-English **summary** of what the team is telling the founder.
- The **strategic-issues vs quick-wins split** (Rajat's idea — the light, on-thesis action-gap solution).
- A suggested **"one thing to fix this week."**

**Why it's a real market gap for SMALL customers:** a non-technical founder with no HR function stares at a report and doesn't know what it MEANS or what to DO. Big companies have HR to interpret; small ones don't. AI interpretation fills exactly that gap. Its absence IS a lack in the current market for this segment.

### 3.2 What it is NOT (hard walls)
- NOT an accountability/monitoring engine. NOT manager-compliance tracking. NOT monthly nudge automation. (That's the scope-creep version, cut.)
- NOT inference on individuals or psychological state — EU AI Act prohibited. It summarises GROUP sentiment; it never profiles a person.
- An INTERPRETATION layer, never an ACTION/MONITORING layer.

### 3.3 The data contract (critical — this keeps it legal and on-thesis)
- **The LLM receives ONLY the aggregate, k-enforced report object** — the same numbers a human sees in the report AFTER k-suppression and roll-up. Scores per question/theme, response rate, distributions.
- **NEVER** raw responses. **NEVER** identity. **NEVER** a sub-k cell. The prompt is built from the *report*, not the *answers*.
- If a segment is suppressed/rolled-up for humans, it is equally invisible to the AI. The AI sees exactly what a viewer at that scope sees — nothing more.

### 3.4 Predefined prompts & segments
- Ship a library of predefined prompts (summary, strategic/quick-wins, priority action) — the founder doesn't write prompts.
- Prompts operate on report segments the viewer is entitled to see (respecting scope + k).
- Keep prompts versioned and auditable (part of the trust story).

### 3.5 Provider & governance rules (you, of all people, get this right)
- **Provider abstraction:** OpenAI / Anthropic behind one interface (like the F.U.N. `providers.py` pattern), configurable per deployment.
- **No-training / zero-retention terms only.** Given EU employee data (even aggregated), use enterprise API terms where the provider does not train on the data and retains nothing. Both OpenAI and Anthropic offer this — use it.
- **EU processing preference / disclosure:** default to zero-retention and disclose the processor in the DPA. Do not quietly ship EU employee-survey data to a US model training-on. This is a governance detail that protects the whole EU positioning.
- **Optionally bring-your-own-key** for customers who want their own provider relationship.

### 3.6 PLG / pricing role
- AI interpretation is a **paid upsell / higher tier / credit-consuming feature** — a reason to buy up. That's exactly what PLG expansion wants: value that scales willingness-to-pay, self-serve, no sales call.
- Build the confidential survey + report first (P0/P1). Validate people pay for THAT. Then add AI as the expansion lever.

---

## 4. BUILD / PHASE ORDER

1. **P0 — Resend account + domain verification.** Reach live cycle. Run 3–5 design-partner cycles. VALIDATE willingness-to-pay.
2. **P1 hardening — RLS first** (the public blocker), then SSO, then Stripe, then landing page with specific-founder-moment positioning.
3. **P2 — PLG polish:** shareable/marked report, cycle-over-cycle comparison, frictionless self-serve path. (Much of this overlaps P1.)
4. **P3 — AI interpretation layer (v1.1):** only after P1 validates payment. Aggregate-only data contract, predefined prompts, strategic/quick-wins output, provider governance.

**Do not reorder P3 before P1.** AI is expansion revenue on a validated core, not a way to make an unvalidated core interesting.

---

## 5. GUARDRAILS (hold across everything)

1. **Confidentiality wall above all layers** — AI included. Aggregate, k-safe data only; never individuals; never sub-k.
2. **RLS before public** — no exceptions.
3. **No surveillance** — no monitoring/accountability engine, no individual or psychological inference.
4. **PLG discipline** — every feature usable by one non-technical founder, zero onboarding.
5. **Specific-founder-moment positioning** — never generic "engagement."
6. **Provider governance** — zero-retention/no-training terms, disclosed processing, EU-conscious.

*P0 is days away and needs only a Resend account. Public launch is RLS-gated. AI is a v1.1 expansion lever on a validated core. Build the confidential survey people pay for first; make it spread through its own report; add AI interpretation to make them pay more. Nothing here changes the one truth: the next real signal comes from a founder saying yes, not from more build.*

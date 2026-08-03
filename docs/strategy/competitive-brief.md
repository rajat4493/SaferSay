# Competitive Brief — Confidential Employee Surveys

Researched 2026-08-03. Sources cited inline; re-verify before external use (review-site sentiment shifts).

## Who we're actually up against

| Tool | Price (per user/mo) | G2 rating | Segment |
|---|---|---|---|
| Culture Amp | Custom (no published rate) | 4.5 (1,516 reviews) | Mid-market/enterprise, science-backed |
| Lattice | Per-seat + $4k/yr minimum | 4.7 (4,020 reviews) | Mid-market, bundles perf+eng |
| Officevibe (Workleap) | $3.50–$5 | 4.3 (200+ reviews) | SMB, lightweight pulse |
| TinyPulse | Legacy, largely superseded | — | SMB, mostly displaced by above |

**Where SaferSay doesn't compete today:** none of these are priced or scoped for 10–60 person companies as a primary segment — Lattice's $4k/yr minimum alone prices out most of our target market. That's a real open lane, not a differentiator to invent later.

## Real, sourced pain points

1. **"Anonymous" doesn't mean trusted.** A widely-discussed incident (a company accidentally exposing unfiltered results) is the reference point people bring up — the fear isn't hypothetical, it's "what happens when the tool breaks." [Best Anonymous Employee Feedback Tools 2026](https://peoplemanagingpeople.com/tools/best-anonymous-employee-feedback-tool/)
2. **~1 in 4 employees admit they don't answer honestly**, and over half at large tech companies fear backlash from their answers — trust is the actual product being sold, not the survey UI. [Blind: Nearly a quarter of employees are NOT being honest on pulse surveys](https://www.teamblind.com/blog/index.php/2019/12/19/nearly-a-quarter-of-employees-are-not-being-honest-on-employee-pulse-surveys)
3. **The specific mechanic that earns trust is threshold-gated anonymity + role-based access + no timestamp deanonymization** — this is *exactly* what SaferSay's severance architecture already does; it's validated as the trust lever, not a nice-to-have. [Best Anonymous Employee Feedback Tools 2026](https://peoplemanagingpeople.com/tools/best-anonymous-employee-feedback-tool/)
4. **Culture Amp users complain reports are hard to navigate without training** — an ease-of-use gap at the high end of the market. [15 Best Culture Amp Alternatives](https://www.culturemonkey.io/employee-engagement/culture-amp-alternatives/)
5. **Officevibe wins SMB on price + simplicity but is reported to feel constrained for complex org structures** — validates staying simple rather than chasing enterprise org-hierarchy depth too early. [Officevibe Review & Pricing 2026](https://www.performancereviewssoftware.com/software/officevibe-review/)
6. **SMBs specifically lack dedicated HR headcount** — the buyer is often a founder/ops lead, not an HR specialist, so the product needs to work with zero HR expertise, not assume it. [selectsoftwarereviews.com Best Employee Engagement Tools](https://www.selectsoftwarereviews.com/buyer-guide/best-employee-engagement-software)

## What this means for SaferSay

- **Positioning**: "Culture Amp's trust guarantee, Officevibe's price and simplicity, built for the 10–60 person company neither of them are built for."
- **Don't** build deep org-hierarchy/permission complexity before nailing zero-HR-expertise onboarding — that's an Officevibe-validated risk, not a hypothesis.
- **Do** make the severance architecture visible and explainable in-product (a plain-language "how this stays anonymous" page), since trust is admitted-scarce industry-wide, not assumed-present.
- Competitor pricing confirms room for a genuinely cheap ($3–5/employee/mo range) SMB-first tier — informs the billing-tier gap already flagged in the roadmap.

## Gaps in this research (be honest about it)

- No direct interviews conducted — this is desk research from public reviews/search, not primary user research.
- No pricing/packaging data for Peakon (Workday-owned) or newer entrants (Awardco, CultureMonkey) — worth a follow-up pass before finalizing pricing.

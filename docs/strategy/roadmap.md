# SaferSay Roadmap

Last updated: 2026-08-03. Re-sequenced per founder direction: the grievance channel is strategically important but was mis-prioritized in the first pass — it adds legal complexity, new roles, audit trails, and copy risk that aren't needed to prove the core product. The real question to answer first is: **can a 10–60 person company run one confidential survey, get enough responses, see useful output, and pay?** Everything in P0 exists to answer that question; nothing else should jump the queue.

## P0 — make one real paid confidential survey work

1. **Verified email sender/domain** (`survey@safersay.com`) — an untrusted sandbox sender directly hurts response rate and trust on the first thing a respondent sees. *Requires account-level action (DNS + Resend dashboard) outside this repo; code should enforce it via the readiness gate.*
2. **End-to-end live survey test** — admin creates cycle → employees receive real links → respondents submit → token spent → report unlocks at k≥5. This is the product spine; it must be provably true, not assumed.
3. **DB migration verification + integration tests** — repeatable and automated against Supabase, not just applied once by hand. Protects the confidentiality claim structurally, not just by inspection.
4. **Stripe checkout + webhook + persisted billing** — proves willingness to pay. Keep pricing simple: per-cycle first, monthly/floor tier later.
5. **Security hardening** — rate limiting, CSP/security headers, secret rotation, fix the middleware's non-constant-time comparison, fail-closed production mode.
6. **CI/CD** — GitHub checks for lint/test/build/migration safety before deployment.

## P1 — make the pilot trustworthy and measurable

7. **In-product confidentiality explainer** — cheap, high-trust, high-conversion; directly addresses the #1 sourced buyer objection (employees don't trust "anonymous"). Ships before grievance, not after.
8. **TAT instrumentation completion** — signup → employees → cycle → invites → *first response* → *report* (the last two aren't wired yet; see `onboarding-tat-plan.md`). Tells us if "easy to start" is actually true.
9. **Observability** — Sentry-class error tracking + structured server logs.
10. **Action loop / recommendations** ("You said / we will / done") — likely the biggest real product differentiator once there's response data to act on. Build before grievance.

## P2 — after first pilot signal

11. Role/access matrix (admin/viewer scopes).
12. Data retention/deletion controls.
13. Real PDF export.
14. Org hierarchy import + Google/Microsoft directory connectors.
15. **Grievance / lawful-disclosure channel** — [`grievance-channel-spec.md`](grievance-channel-spec.md), with legal review. Moved here deliberately: it's a real differentiator once the core survey product has proven demand, not before.

## Explicitly deferred, not forgotten

- SMB self-serve billing *tier design* (multiple price points) — start with simple per-cycle pricing (P0 #4); tier/floor pricing is a P2+ optimization once there's real usage data.
- Deep org-hierarchy/permission complexity ahead of onboarding simplicity — Officevibe's reviews show this trade-off burns SMB tools; stay simple until TAT data says otherwise.
- Client-side product analytics (page views, click tracking) — server-side funnel events are sufficient until there's real traffic volume.
- Jurisdiction-specific grievance-channel compliance templates (POSH committee rules, per-member-state EU anonymity variations) — ship the structural model first, layer jurisdiction specifics after legal review, after P0/P1 prove demand.

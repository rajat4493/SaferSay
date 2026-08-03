# SaferSay Roadmap

Last updated: 2026-08-03. Merges the production-readiness assessment with competitive research, the grievance-channel spec, and the TAT instrumentation plan. Full detail on each item lives in the linked docs.

## Now

Launch blockers — nothing below this line should be marketed as "production ready."

1. **Real authentication** — Google/Microsoft OAuth via Supabase, session-bound tenants. *(Shipped 2026-08-03, commit `accfcbf`.)*
2. **Onboarding TAT instrumentation** — [`onboarding-tat-plan.md`](onboarding-tat-plan.md). Ship early: every later prioritization call benefits from real data instead of guesses.
3. **Apply/verify DB migrations against a real Supabase EU project** + DB-backed integration tests.
4. **Stripe webhook + persisted billing state** — currently mock-only checkout.
5. **Verified Resend sender domain** (`survey@safersay.com`) — currently on shared sandbox sender.
6. **Basic security hardening** — rate limiting, CSP/security headers, fix the middleware's non-constant-time comparison flagged in the original audit.

## Next

Needed before a real customer pilot beyond internal testing.

7. **Audit log infrastructure** — prerequisite for #8, also closes `PRODUCT_GAPS.md` #10 on its own.
8. **Grievance / lawful-disclosure channel** — [`grievance-channel-spec.md`](grievance-channel-spec.md). Structurally separate from the anonymous engagement-survey path; requires outside legal review before shipping the "confidential" claim for this feature specifically.
9. **Role/access matrix** (owner/admin/employee/investigator) — dependency for #8's investigator role.
10. **Observability** — error tracking (Sentry-class tool) + structured logging; currently zero visibility into production failures.
11. **CI/CD pipeline** — lint/test/build gate on PRs, deployment config. Nothing currently blocks a broken build from shipping.
12. **SMB self-serve billing tier** — competitive research ([`competitive-brief.md`](competitive-brief.md)) shows real room for a $3–5/employee/mo tier below Lattice's $4k/yr minimum; needed for expansion beyond hand-onboarded pilots.

## Later

Product completeness, once the above is real.

13. Org hierarchy import + manager mapping, Google Workspace / Microsoft 365 directory connectors.
14. Real PDF export.
15. Data retention & deletion controls.
16. Viewer scope enforcement by role/hierarchy; survey builder editing/reordering.
17. In-product "how this stays anonymous" explainer — competitive research shows trust, not features, is the actual thing being sold; make the severance guarantee visible, not just true.

## Explicitly deferred, not forgotten

- Deep org-hierarchy/permission complexity ahead of onboarding simplicity — Officevibe's reviews show this trade-off burns SMB tools; stay simple until TAT data says otherwise.
- Client-side product analytics (page views, click tracking) — server-side funnel events (#2) are sufficient until there's real traffic volume.
- Jurisdiction-specific grievance-channel compliance templates (POSH committee rules, per-member-state EU anonymity variations) — ship the structural model first, layer jurisdiction specifics after legal review.

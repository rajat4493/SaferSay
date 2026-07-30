# PRODUCT_GAPS.md

## Now Implemented Locally

- Admin app shell.
- Viewer portal.
- Survey taker route.
- Template library with real questions.
- Local persistent identity/participation and response stores.
- Server API slice for seed, payment, launch, invites, reminders, respondent submit, and protected report.
- Mock Stripe mode when no key is configured.
- Mock Resend mode when no key is configured.
- Token submission flow.
- Protected reporting at k >= 5.
- Brand Studio for client rebrand/theme/logo/font.
- Integrations page with connection roadmap.

## Still Missing For A Real SaaS Product

1. Apply Postgres migration and implement durable repository methods.
2. Real authentication and tenant provisioning.
3. Stripe webhook verification and persisted billing state.
4. Resend production sender/domain setup.
5. Role/access matrix inside SaferSay, not just AD/SSO.
6. Organisation hierarchy import and manager mapping.
7. CSV upload parser and review screen.
8. Google Workspace and Microsoft 365 SSO/directory connectors.
9. Real PDF export.
10. Audit logs and admin access history.
11. Data retention/deletion controls.
12. Viewer scope enforcement by role and hierarchy.
13. Survey builder editing/reordering.
14. Production security hardening.

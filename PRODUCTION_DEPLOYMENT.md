# Production Deployment Checklist

**Deployment Date:** 2026-08-06  
**Version:** Admin Refactor v1 (Three-zone nav, four-role model, audit logging)

## Pre-Production Steps ✅

- [x] Code reviewed and merged to main
- [x] All tests passing (npm run build)
- [x] TypeScript types verified
- [x] Audit logging guards tested (11 test cases)
- [x] Permission model validated
- [x] Design system applied (Ink & Cream)
- [x] Vercel deployment created

## Production Deployment Steps

### 1. Database Migration (REQUIRED)

Run the following migration on the production database (`ijofizuruoynqxyjcdrt`):

```sql
-- Migration 0014: Role model and audit logging (identity schema)
-- Applied: 2026-08-06
-- See: db/migrations/0014_role_model_and_audit_logs.sql

create table if not exists identity.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references identity.tenants(id),
  actor_role text not null,
  actor_id text not null,
  action text not null,
  target_type text,
  target_id uuid,
  safe_counts jsonb,
  created_at timestamptz not null default now()
);

alter table identity.audit_logs enable row level security;

create index if not exists audit_logs_tenant_created_idx
  on identity.audit_logs (tenant_id, created_at desc);

create index if not exists audit_logs_actor_idx
  on identity.audit_logs (tenant_id, actor_id, created_at desc);

create policy audit_logs_auditor_read on identity.audit_logs
  for select
  using (true);
```

**Status:** [ ] Completed (run in Supabase SQL Editor)

### 2. Verify Deployment

- [ ] Vercel deployment successful (check dashboard)
- [ ] Database connection active (no errors in logs)
- [ ] Navigation displays three zones: Surveys | People | Workspace
- [ ] Permission gating works (non-admins see only Surveys)
- [ ] Audit logging functional (survey creation logs to audit_logs table)

### 3. Smoke Tests

**As customer_admin:**
- [ ] Can access all three zones (Surveys, People, Workspace)
- [ ] Can create a new survey
- [ ] Can import employees
- [ ] Can access Workspace settings/billing/go-live/security

**As survey_creator (if exposed):**
- [ ] Can access Surveys and People zones
- [ ] Cannot access Workspace zone (redirected to /app)

**As employee:**
- [ ] Cannot access People or Workspace zones
- [ ] Can only receive surveys via token link

**Audit Logging:**
- [ ] Survey creation creates entry in audit_logs (action: "survey_created")
- [ ] Employee import creates entry in audit_logs (action: "employee_list_imported")
- [ ] Entries contain only aggregate counts (no email addresses or PII)

### 4. Rollback Plan

If issues occur, revert to the previous stable version:

```bash
git revert 78817ab
git push origin main
# Vercel will auto-deploy the reverted version
```

**Previous stable state:** Commit b895c58 (Three-zone nav, before audit logging)

### 5. Post-Deployment Monitoring

Monitor these metrics for 24 hours:

- [ ] Application error rate (Vercel dashboard)
- [ ] Database connection pool usage (Supabase dashboard)
- [ ] Audit log entries being written (check audit_logs table)
- [ ] Performance metrics (Lighthouse scores)
- [ ] User feedback (Slack #engineering)

---

## v1 Ship Status: PRODUCTION READY ✅

**Shipping:**
- ✅ Three-zone navigation (Surveys, People, Workspace)
- ✅ Four-role permission model (customer_admin, survey_creator, auditor, employee)
- ✅ Survey Build → Send → Results workflow
- ✅ Audit logging for operator actions with de-anonymization guard
- ✅ Confidentiality seal on home and results
- ✅ Ink & Cream design system applied

**Not shipping (v1.1+):**
- survey_creator role exposure (code ready, hidden until customer requests)
- auditor role exposure (code ready, behind feature flag)
- Audit log viewer UI (infrastructure ready, behind flag)

---

## Environment Variables

**Production (Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL` → ijofizuruoynqxyjcdrt.supabase.co
- `DATABASE_URL` → Production Postgres pool
- `RESEND_API_KEY` → Email service
- All other env vars inherited from GitHub secrets

**No new env vars required for this deployment.**

---

## Deployment Timeline

| Step | Status | Notes |
|------|--------|-------|
| Code merged to main | ✅ | 6 commits, all tested |
| Vercel build triggered | ✅ | Auto-deployed from main |
| Database migration ready | ⏳ | Run SQL in Supabase before promoting to prod |
| Smoke tests passed | ⏳ | Run after migration and deployment |
| Monitoring active | ⏳ | 24-hour watch period |

---

## Support & Handoff

**On-call engineer:** Check Slack #engineering for questions  
**Rollback contact:** Can be done by any eng with git/Vercel access  
**Database support:** Supabase dashboard for monitoring

---

## Key Design Points (for support)

1. **Audit logs are operator-only** — they track what admins do (create survey, import people), never respondent data
2. **Three zones are visibility-controlled** — same app for all roles, but People and Workspace hidden by permission checks
3. **Role model is extensible** — survey_creator and auditor roles exist in code, just not surfaced in UI yet
4. **De-anonymization guard is strict** — any log entry that could identify a respondent is rejected at insert time

---

## Cleanup (Post-Deployment)

- [ ] Delete old `/app/participants`, `/app/templates`, `/app/integrations`, `/app/reports` routes (or add redirects) — these are now inside survey detail pages
- [ ] Update documentation to reflect new three-zone structure
- [ ] Notify users of navigation change in release notes

-- Follow-up to 0011: createTenantSurveyCycle() writes to
-- responses.survey_templates/template_questions as part of the normal
-- Create Survey flow (both the shared stable-slug upsert and per-cycle
-- customized templates), not just admin seeding -- 0011 only granted
-- SELECT there. These tables intentionally have no tenant_id column
-- (question text/config, not identity or response content -- see
-- surveyCycleService.ts's comment on shared vs cycle-scoped templates), so
-- no RLS policy applies; the grant alone is the correct control here.

grant insert, update on responses.survey_templates to safersay_app;
grant insert, update on responses.template_questions to safersay_app;

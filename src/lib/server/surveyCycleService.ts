import { createHash, randomUUID } from "crypto";
import type { Queryable } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { surveyTemplates, type SurveyTemplate } from "@/lib/templates";

export type CustomCycleQuestion = {
  text: string;
  type: "likert_5" | "enps_0_10" | "open_text";
  construct: string;
  optional?: boolean;
};

export async function createTenantSurveyCycle(params: {
  db: Queryable;
  tenantId: string;
  tenantName: string;
  templateSlug: string;
  cycleName?: string;
  questions?: CustomCycleQuestion[];
}) {
  const template = surveyTemplates.find((item) => item.slug === params.templateSlug);
  if (!template) throw new Error("Template was not found.");

  const identity = new IdentityRepository(params.db);
  const employeeCount = await identity.countActiveEmployees(params.tenantId);
  if (employeeCount < 1) throw new Error("Upload employees before creating a survey cycle.");
  if (employeeCount > 100) throw new Error("Survey credits currently cover up to 100 active employees. Contact SaferSay for a larger workspace.");

  const cycleId = randomUUID();
  const templateId =
    params.questions && params.questions.length > 0
      ? await createCycleScopedTemplate(params.db, template, cycleId, params.questions)
      : await upsertTemplate(params.db, template);
  const minGroupSize = await identity.getMinGroupSize(params.tenantId);
  await params.db.query(
    `insert into responses.survey_cycles
      (id, tenant_id, template_id, name, status, payment_status, min_group_size)
     values ($1, $2, $3, $4, 'draft', 'unpaid', $5)`,
    [cycleId, params.tenantId, templateId, params.cycleName?.trim() || `${params.tenantName} ${template.name}`, minGroupSize],
  );

  const tokens = await identity.issueTokens(params.tenantId, cycleId);
  const invitesPrepared = await identity.createInviteOutboxForIssuedTokens(params.tenantId, cycleId, tokens);

  return {
    cycleId,
    template: { slug: template.slug, name: template.name },
    employees: employeeCount,
    tokensIssued: tokens.length,
    invitesPrepared,
  };
}

async function upsertTemplate(db: Queryable, template: SurveyTemplate) {
  const templateId = stableUuidFromSlug(`template:${template.slug}`);
  await db.query(
    `insert into responses.survey_templates (id, slug, name, description, category, estimated_minutes)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (slug) do update
     set name = excluded.name,
         description = excluded.description,
         category = excluded.category,
         estimated_minutes = excluded.estimated_minutes`,
    [templateId, template.slug, template.name, template.description, template.category, estimateMinutes(template.duration)],
  );

  for (const [index, question] of template.questions.entries()) {
    await db.query(
      `insert into responses.template_questions
        (id, template_id, position, question_text, question_type, construct, is_optional)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (template_id, position) do update
       set question_text = excluded.question_text,
           question_type = excluded.question_type,
           construct = excluded.construct,
           is_optional = excluded.is_optional`,
      [
        stableUuidFromSlug(`question:${template.slug}:${question.id}`),
        templateId,
        index + 1,
        question.text,
        question.type,
        question.construct,
        Boolean(question.optional),
      ],
    );
  }

  return templateId;
}

/**
 * Customized cycles get their own template row instead of the shared
 * stable-hash one `upsertTemplate` writes — so editing/reordering/removing
 * questions for one tenant's cycle never mutates the base template other
 * tenants use unmodified.
 */
async function createCycleScopedTemplate(
  db: Queryable,
  baseTemplate: SurveyTemplate,
  cycleId: string,
  questions: CustomCycleQuestion[],
) {
  const templateId = randomUUID();
  const slug = `${baseTemplate.slug}-${cycleId}`;
  await db.query(
    `insert into responses.survey_templates (id, slug, name, description, category, estimated_minutes)
     values ($1, $2, $3, $4, $5, $6)`,
    [templateId, slug, baseTemplate.name, baseTemplate.description, baseTemplate.category, estimateMinutes(baseTemplate.duration)],
  );

  for (const [index, question] of questions.entries()) {
    await db.query(
      `insert into responses.template_questions
        (id, template_id, position, question_text, question_type, construct, is_optional)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), templateId, index + 1, question.text, question.type, question.construct, Boolean(question.optional)],
    );
  }

  return templateId;
}

function estimateMinutes(duration: string) {
  const match = duration.match(/(\d+)\s+minutes?/i);
  return match ? Number(match[1]) : 5;
}

function stableUuidFromSlug(value: string) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

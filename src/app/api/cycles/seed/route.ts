import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext, type Queryable } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { seedServerEmployees } from "@/lib/serverStore";
import { surveyTemplates } from "@/lib/templates";
import { canImportEmployees } from "@/lib/permissions";

const defaultTemplateId = "00000000-0000-4000-8000-000000000101";
const defaultQuestionIds = [
  "00000000-0000-4000-8000-000000000201",
  "00000000-0000-4000-8000-000000000202",
  "00000000-0000-4000-8000-000000000203",
];

async function seedIntoDatabase(db: Queryable, tenant: { id: string; name: string; slug: string }) {
  const template = surveyTemplates[0];
  await db.query(
    `insert into responses.survey_templates (id, slug, name, description, category, estimated_minutes)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (slug) do update
     set name = excluded.name,
         description = excluded.description,
         category = excluded.category,
         estimated_minutes = excluded.estimated_minutes`,
    [defaultTemplateId, template.slug, template.name, template.description, template.category, 5],
  );

  for (const [index, question] of template.questions.slice(0, 3).entries()) {
    await db.query(
      `insert into responses.template_questions
        (id, template_id, position, question_text, question_type, construct, is_optional)
       values ($1, $2, $3, $4, 'likert_5', $5, false)
       on conflict (template_id, position) do update
       set question_text = excluded.question_text,
           construct = excluded.construct`,
      [defaultQuestionIds[index], defaultTemplateId, index + 1, question.text, question.construct],
    );
  }

  const cycleId = randomUUID();
  await db.query(
    `insert into responses.survey_cycles
      (id, tenant_id, template_id, name, status, payment_status)
     values ($1, $2, $3, $4, 'draft', 'free_preview')`,
    [cycleId, tenant.id, defaultTemplateId, `${tenant.name} Engagement Check`],
  );

  const employees = Array.from({ length: 31 }, (_, index) => ({
    email: `employee${index + 1}@${tenant.slug}.example`,
    name: `Employee ${index + 1}`,
    team: ["Product", "Sales", "Operations", "Leadership"][index % 4],
    location: "EU",
  }));
  const identity = new IdentityRepository(db);
  const employeesImported = await identity.importEmployees(tenant.id, employees);
  const tokens = await identity.issueTokens(tenant.id, cycleId);

  return {
    tenant,
    cycleId,
    employees: employeesImported,
    participants: tokens.length,
    mode: "database" as const,
  };
}

export async function POST() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canImportEmployees(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to seed workspace data." }, { status: 403 });
  }

  const { tenant } = session;
  const tenantPool = getTenantPool();

  if (tenantPool) {
    const result = await withTenantContext(tenantPool, tenant.id, (client) => seedIntoDatabase(client, tenant));
    return NextResponse.json(result);
  }

  const adminPool = getDatabasePool();
  if (adminPool) {
    const result = await seedIntoDatabase(adminPool, tenant);
    return NextResponse.json(result);
  }

  const result = await seedServerEmployees(tenant.id);
  return NextResponse.json(result);
}

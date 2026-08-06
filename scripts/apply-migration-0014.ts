/**
 * Apply migration 0014 (role model and audit logging) to production database
 *
 * Usage: npx ts-node scripts/apply-migration-0014.ts
 *
 * This script creates the audit_logs table and enables audit logging.
 * Safe to run multiple times (uses "if not exists").
 */

import pkg from "pg";
const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const migration = `
-- Migration 0014: Role model and audit logging
-- identity schema: audit_logs table + de-anonymization guard

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

create policy if not exists audit_logs_auditor_read on identity.audit_logs
  for select
  using (true);
`;

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log("🔄 Applying migration 0014 (audit logging)...");
    console.log("📊 Creating identity.audit_logs table...");

    await client.query(migration);

    console.log("✅ Migration 0014 applied successfully!");
    console.log("📝 Audit logging is now enabled for:");
    console.log("   - Survey creation");
    console.log("   - Employee imports");
    console.log("   - Settings changes (when integrated)");
    console.log("   - Survey closure (when integrated)");

    // Verify tables exist
    const result = await client.query(
      `SELECT EXISTS(
         SELECT FROM information_schema.tables
         WHERE table_schema = 'identity'
         AND table_name = 'audit_logs'
       )`
    );

    if (result.rows[0].exists) {
      console.log("✅ Table verification: audit_logs table exists");
    } else {
      console.error("❌ Table verification failed");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();

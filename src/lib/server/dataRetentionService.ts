import type { Pool } from "pg";

export type RetentionPurgeResult = {
  tenantId: string;
  retentionMonths: number;
  cyclesPurged: number;
  submissionsDeleted: number;
  answersDeleted: number;
  participantsDeleted: number;
};

/**
 * Deletes response/participation data for cycles that closed more than a
 * tenant's retention_months ago. Runs on the privileged admin pool (not a
 * tenant-scoped RLS connection) because it's a platform-wide maintenance
 * job iterating every tenant -- every query is still explicitly scoped by
 * tenant_id, the same discipline RLS would otherwise enforce.
 *
 * Deliberately narrow: only responses.submissions/answers and
 * identity.survey_participants/invite_outbox for cycles past their
 * retention window. Does NOT touch identity.sos_reports (safety
 * reports need their own, separately-decided retention policy, not
 * silently inherited from survey data retention) or identity.audit_logs
 * (accountability records; most compliance regimes want these kept
 * *longer* than operational data, not purged on the same clock). Does
 * NOT touch the employee directory itself -- retention_months governs
 * survey response data, not whether someone is still a known employee.
 */
export async function purgeExpiredCycleData(pool: Pool, tenantId: string, retentionMonths: number): Promise<RetentionPurgeResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expiredCycles = await client.query<{ id: string }>(
      `select id from responses.survey_cycles
       where tenant_id = $1
         and status = 'closed'
         and actual_closed_at is not null
         and actual_closed_at < now() - ($2 || ' months')::interval`,
      [tenantId, retentionMonths],
    );
    const cycleIds = expiredCycles.rows.map((row) => row.id);

    if (cycleIds.length === 0) {
      await client.query("COMMIT");
      return { tenantId, retentionMonths, cyclesPurged: 0, submissionsDeleted: 0, answersDeleted: 0, participantsDeleted: 0 };
    }

    const answersResult = await client.query(
      `delete from responses.answers
       where submission_id in (select id from responses.submissions where tenant_id = $1 and cycle_id = any($2::uuid[]))`,
      [tenantId, cycleIds],
    );
    const submissionsResult = await client.query(`delete from responses.submissions where tenant_id = $1 and cycle_id = any($2::uuid[])`, [
      tenantId,
      cycleIds,
    ]);
    await client.query(
      `delete from identity.invite_outbox
       where tenant_id = $1
         and participant_id in (select id from identity.survey_participants where tenant_id = $1 and cycle_id = any($2::uuid[]))`,
      [tenantId, cycleIds],
    );
    const participantsResult = await client.query(
      `delete from identity.survey_participants where tenant_id = $1 and cycle_id = any($2::uuid[])`,
      [tenantId, cycleIds],
    );

    // Not every tenant necessarily has a tenant_settings row yet (it's
    // created lazily, see 0002_tenant_bootstrap.sql) -- upsert rather than
    // assuming one exists.
    await client.query(
      `insert into identity.tenant_settings (tenant_id, retention_purge_last_run_at, retention_purge_last_deleted_submissions)
       values ($1, now(), $2)
       on conflict (tenant_id) do update
       set retention_purge_last_run_at = now(), retention_purge_last_deleted_submissions = excluded.retention_purge_last_deleted_submissions`,
      [tenantId, submissionsResult.rowCount ?? 0],
    );

    await client.query("COMMIT");
    return {
      tenantId,
      retentionMonths,
      cyclesPurged: cycleIds.length,
      submissionsDeleted: submissionsResult.rowCount ?? 0,
      answersDeleted: answersResult.rowCount ?? 0,
      participantsDeleted: participantsResult.rowCount ?? 0,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function purgeExpiredCycleDataForAllTenants(pool: Pool): Promise<RetentionPurgeResult[]> {
  // tenant_settings is created lazily, so a tenant without one yet still
  // gets the same default the column itself declares (24 months) rather
  // than being skipped.
  const tenants = await pool.query<{ id: string; retention_months: number }>(
    `select t.id, coalesce(ts.retention_months, 24) as retention_months
     from identity.tenants t
     left join identity.tenant_settings ts on ts.tenant_id = t.id`,
  );
  const results: RetentionPurgeResult[] = [];
  for (const tenant of tenants.rows) {
    results.push(await purgeExpiredCycleData(pool, tenant.id, tenant.retention_months));
  }
  return results;
}

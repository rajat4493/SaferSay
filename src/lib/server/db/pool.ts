import { Pool } from "pg";

let pool: Pool | null = null;

export function getDatabasePool() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export function requireDatabasePool() {
  const databasePool = getDatabasePool();
  if (!databasePool) throw new Error("DATABASE_URL is required for this operation.");
  return databasePool;
}

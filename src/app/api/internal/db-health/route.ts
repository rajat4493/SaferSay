import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { runSeveranceHealthCheck } from "@/lib/server/severanceHealth";

export async function GET(request: NextRequest) {
  const healthcheckSecret = process.env.HEALTHCHECK_SECRET;

  if (healthcheckSecret) {
    const suppliedSecret = request.headers.get("x-safersay-healthcheck-secret");
    if (suppliedSecret !== healthcheckSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized health check." }, { status: 401 });
    }
  }

  const pool = getDatabasePool();
  if (!pool) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  try {
    const health = await runSeveranceHealthCheck(pool);
    return NextResponse.json(health, { status: health.ok ? 200 : 500 });
  } catch {
    return NextResponse.json({ ok: false, error: "Database health check failed." }, { status: 500 });
  }
}

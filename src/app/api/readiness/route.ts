import { NextResponse } from "next/server";
import { getRuntimeMode, runtimeChecks } from "@/lib/runtimeConfig";

/**
 * Unauthenticated by design (used as a simple external "is prod mode on"
 * ping) -- but must not name which specific secrets/integrations are
 * configured or missing. That level of detail is reconnaissance for
 * attacking this deployment; it's gated behind super-admin at
 * /console/readiness for anyone who actually needs it.
 */
export async function GET() {
  const checks = runtimeChecks();
  const missingProduction = checks.filter((check) => check.requiredForProduction && !check.configured);
  return NextResponse.json({
    mode: getRuntimeMode(),
    productionReady: missingProduction.length === 0,
  });
}

import { NextResponse } from "next/server";
import { getRuntimeMode, runtimeChecks } from "@/lib/runtimeConfig";

export async function GET() {
  const checks = runtimeChecks();
  const missingProduction = checks.filter((check) => check.requiredForProduction && !check.configured);
  return NextResponse.json({
    mode: getRuntimeMode(),
    productionReady: missingProduction.length === 0,
  });
}

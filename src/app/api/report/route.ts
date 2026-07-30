import { NextResponse } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { getDefaultCycle, getProtectedServerReport } from "@/lib/serverStore";

export async function GET() {
  const db = getDatabasePool();
  if (db) {
    return NextResponse.json(await new ResponseRepository(db).getProtectedReport(getDefaultCycle().id));
  }
  return NextResponse.json(await getProtectedServerReport());
}

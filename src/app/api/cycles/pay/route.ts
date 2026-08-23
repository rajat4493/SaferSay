import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Cycle checkout has moved to survey credits. Use /api/billing/checkout." },
    { status: 410 },
  );
}

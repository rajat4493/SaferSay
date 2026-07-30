import { NextResponse } from "next/server";
import { launchPaidCycle } from "@/lib/serverStore";

export async function POST() {
  return NextResponse.json({ cycle: await launchPaidCycle() });
}

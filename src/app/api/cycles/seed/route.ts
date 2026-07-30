import { NextResponse } from "next/server";
import { seedServerEmployees } from "@/lib/serverStore";

export async function POST() {
  const result = await seedServerEmployees();
  return NextResponse.json(result);
}

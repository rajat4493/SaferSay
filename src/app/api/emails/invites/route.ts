import { NextRequest, NextResponse } from "next/server";
import { sendSurveyInvites } from "@/lib/emailService";
import { getInviteTargets } from "@/lib/serverStore";

export async function POST(request: NextRequest) {
  const targets = await getInviteTargets();
  const result = await sendSurveyInvites(targets, request.nextUrl.origin);
  return NextResponse.json(result);
}

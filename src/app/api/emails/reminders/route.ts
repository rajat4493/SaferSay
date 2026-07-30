import { NextRequest, NextResponse } from "next/server";
import { sendSurveyInvites } from "@/lib/emailService";
import { getInviteTargets, incrementReminderCounts } from "@/lib/serverStore";

export async function POST(request: NextRequest) {
  const targets = await getInviteTargets();
  const result = await sendSurveyInvites(targets, request.nextUrl.origin);
  const reminded = await incrementReminderCounts();
  return NextResponse.json({ ...result, reminded });
}

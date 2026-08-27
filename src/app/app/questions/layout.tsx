import { redirect } from "next/navigation";
import { requireSessionContext } from "@/lib/server/authSession";
import { canCreateSurvey } from "@/lib/permissions";

// The question bank is a creation/management surface only -- unlike Build
// or Send (which read-only roles legitimately view, just without the
// mutating controls), there's no read-only view of this page anyone is
// meant to reach: it's already hidden from the nav for every role except
// customer_admin/survey_creator (see AppShell.tsx's foldedMenuItems).
// Direct-URL access should match that, not just rely on the underlying
// /api/question-bank 403s.
export default async function QuestionsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionContext("/app/questions");
  if (!canCreateSurvey(session.role)) redirect("/app");
  return children;
}

import { redirect } from "next/navigation";
import { requireSessionContext } from "@/lib/server/authSession";
import { canAccessSecurityProof } from "@/lib/permissions";

// Deliberately its own top-level route, not nested under /app/workspace/*
// -- that layout gates its whole subtree to customer_admin only, but this
// page's own permission (canAccessSecurityProof) is broader, including
// compliance_reviewer (and, before the eight-role model, auditor) --
// nesting under workspace silently redirected them away even though the
// nav correctly showed them the link. Real bug found while running a live
// persona simulation: a compliance_reviewer clicking "Security" in their
// account menu landed back on /app with no explanation.
export default async function SecurityProofLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionContext("/app/security-proof");
  if (!canAccessSecurityProof(session.role)) redirect("/app");
  return children;
}

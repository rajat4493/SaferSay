import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/server/authSession";
import { canAccessAuditLog } from "@/lib/permissions";

export default async function AuditLogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  // Gate to customer_admin and compliance_reviewer -- the two roles permissions.ts
  // grants audit-log access to. Not under /app/workspace: compliance has no
  // Workspace access, but does have audit-log access.
  if (!canAccessAuditLog(session.role)) {
    redirect("/app");
  }

  return children;
}

import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/server/authSession";
import { canAccessWorkspace } from "@/lib/permissions";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  // Verify user is authenticated
  if (!session) {
    redirect("/login");
  }

  // Gate Workspace to customer_admin only
  if (!canAccessWorkspace(session.role)) {
    redirect("/app");
  }

  return children;
}

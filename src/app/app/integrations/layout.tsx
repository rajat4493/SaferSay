import { redirect } from "next/navigation";
import { requireSessionContext } from "@/lib/server/authSession";
import { canManageIntegrations } from "@/lib/permissions";

export default async function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionContext("/app/integrations");
  if (!canManageIntegrations(session.role)) redirect("/app");
  return children;
}

import { requireSessionContext } from "@/lib/server/authSession";
import { TenantSessionProvider } from "@/components/TenantSessionProvider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSessionContext("/app");
  return <TenantSessionProvider>{children}</TenantSessionProvider>;
}

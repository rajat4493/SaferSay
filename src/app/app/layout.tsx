import { requireAdminAccess } from "@/lib/server/adminGuard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/app");
  return children;
}

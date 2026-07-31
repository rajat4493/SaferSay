import { requireAdminAccess } from "@/lib/server/adminGuard";

export default async function ViewerLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/viewer");
  return children;
}

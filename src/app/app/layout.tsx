import { requireSessionContext } from "@/lib/server/authSession";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSessionContext("/app");
  return children;
}

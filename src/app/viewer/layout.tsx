import { requireSessionContext } from "@/lib/server/authSession";

export default async function ViewerLayout({ children }: { children: React.ReactNode }) {
  await requireSessionContext("/viewer");
  return children;
}

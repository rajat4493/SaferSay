import { redirect } from "next/navigation";
import { requireSessionContext } from "@/lib/server/authSession";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSessionContext("/console");
  // The console is the Company/Platform-Owner's command centre. A tenant
  // admin has no business here, even by URL guess.
  if (!session.isSuperAdmin) {
    redirect("/app");
  }
  return children;
}

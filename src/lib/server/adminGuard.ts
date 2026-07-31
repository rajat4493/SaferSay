import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAccessCookieName } from "@/lib/adminAccessConstants";
import { verifyAdminAccessToken } from "@/lib/server/adminAccess";

export async function requireAdminAccess(nextPath: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminAccessCookieName)?.value;

  if (!verifyAdminAccessToken(token)) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
}

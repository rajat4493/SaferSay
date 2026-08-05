import "server-only";
import { getRuntimeMode } from "@/lib/runtimeConfig";

/**
 * Dev-only login bypass, for exercising the app (including super-admin
 * routes) without a real Google/Microsoft OAuth round trip. Gated on the
 * same SAFERSAY_RUNTIME_MODE flag that /api/readiness uses to decide
 * whether the app is "in production" -- confirmed live against
 * https://safer-say.vercel.app/api/readiness reporting "mode":"production",
 * so this is hard-off on the real deployment, not just by convention.
 */
export const devAuthCookieName = "safersay_dev_auth_email";

export function isDevAuthAllowed() {
  return getRuntimeMode() !== "production";
}

import type { NextConfig } from "next";

// Baseline security headers -- no CSP script/style nonces exist yet in this
// app, so script-src/style-src keep 'unsafe-inline' rather than breaking
// Next.js hydration; connect-src is scoped to the services this app
// actually calls (Supabase, Sentry) instead of left wide open.
//
// script-src additionally needs 'unsafe-eval' under `next dev` only --
// webpack's dev-mode module wrapping (Fast Refresh/HMR) uses eval() for
// better stack traces, and a strict CSP with no unsafe-eval silently
// breaks client-side state updates across the app in local dev (this is
// what made the dev-login panel, and other client fetches, appear to hang
// -- not a bug in those components). The production build doesn't need
// or get this relaxation.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.sentry.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Redirects for routes retired by the three-zone admin refactor
  // (docs/strategy/CLAUDE_CODE_ADMIN_REFACTOR.md §1) -- their real
  // functionality moved into /app/people and /app/workspace/*, or into
  // the per-survey Build/Send/Results stages. Kept as redirects (not
  // permanent) so old bookmarks/links still land somewhere useful instead
  // of 404ing, without baking the old IA into browser history forever.
  async redirects() {
    return [
      { source: "/app/participants", destination: "/app/people", permanent: false },
      { source: "/app/settings", destination: "/app/workspace/settings", permanent: false },
      { source: "/app/billing", destination: "/app/workspace/billing", permanent: false },
      { source: "/app/security", destination: "/security", permanent: false },
      { source: "/app/workspace/security", destination: "/security", permanent: false },
      { source: "/app/readiness", destination: "/console/readiness", permanent: false },
      { source: "/app/workspace/go-live", destination: "/console/readiness", permanent: false },
      { source: "/app/integrations", destination: "/app", permanent: false },
      { source: "/app/reports", destination: "/app", permanent: false },
      { source: "/app/templates", destination: "/app/surveys/new", permanent: false },
      { source: "/app/templates/:slug", destination: "/app/surveys/new", permanent: false },
    ];
  },
};

export default nextConfig;

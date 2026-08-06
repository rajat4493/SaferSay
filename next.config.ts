import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      { source: "/app/security", destination: "/app/workspace/security", permanent: false },
      { source: "/app/readiness", destination: "/app/workspace/go-live", permanent: false },
      { source: "/app/integrations", destination: "/app", permanent: false },
      { source: "/app/reports", destination: "/app", permanent: false },
      { source: "/app/templates", destination: "/app/surveys/new", permanent: false },
      { source: "/app/templates/:slug", destination: "/app/surveys/new", permanent: false },
    ];
  },
};

export default nextConfig;

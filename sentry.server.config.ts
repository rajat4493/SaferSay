import * as Sentry from "@sentry/nextjs";

// Inert until SENTRY_DSN is set (e.g. in Vercel env vars) -- Sentry.init
// with an empty dsn is a documented no-op, so this is safe to ship before
// a real project/DSN exists.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

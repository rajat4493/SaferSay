import * as Sentry from "@sentry/nextjs";

// Inert until SENTRY_DSN is set -- see sentry.server.config.ts.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

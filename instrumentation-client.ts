import * as Sentry from "@sentry/nextjs";

// Inert until NEXT_PUBLIC_SENTRY_DSN is set -- browser-side errors need a
// NEXT_PUBLIC_ var since only those reach client bundles.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Catches errors thrown by the root layout itself (BrandProvider,
 * DataProvider, font loading, etc.) -- the one place src/app/error.tsx
 * can't reach, since it renders inside that same layout. Next.js requires
 * this file to render its own <html>/<body>, since the layout that would
 * normally provide them is what crashed.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#fbfaf7", color: "#16241f", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 420, textAlign: "center", border: "1px solid #eae6dd", borderRadius: 16, padding: 32, background: "#ffffff" }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>SaferSay couldn&apos;t load</h1>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: "#5f6e68" }}>
              Something went wrong before the page could start. Try again, or email{" "}
              <a href="mailto:support@safersay.com" style={{ color: "#0e6e59", fontWeight: 600 }}>
                support@safersay.com
              </a>
              .
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 24,
                height: 44,
                padding: "0 24px",
                borderRadius: 999,
                background: "#0e6e59",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

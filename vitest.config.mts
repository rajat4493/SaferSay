import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/.next/**", "**/.claude/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // "server-only" throws unless resolved under Next's "react-server"
      // bundler condition, which vitest doesn't set -- alias to its own
      // empty.js (the same no-op Next itself resolves to server-side), so
      // a test can import a module chain that happens to include one
      // without every such test having to fall back to source-string
      // assertions (see resendDelivery.ts's existing callers).
      "server-only": path.resolve(import.meta.dirname, "./node_modules/server-only/empty.js"),
    },
  },
});

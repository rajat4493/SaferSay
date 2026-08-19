import { NextResponse, type NextRequest } from "next/server";

/**
 * OpenAPI 3.1 schema describing the ChatGPT "Actions" surface for
 * SaferSay. Deliberately read-only, one operation, exposing exactly the
 * same k-anonymity-gated data as the PowerBI/Tableau export
 * (/api/report/export) -- no path exists here (or anywhere) for a
 * connector to create surveys, read raw responses, or touch identity
 * data. Auth is the same tenant API key used for every other external
 * integration (see /api/tenants/api-keys), not a separate credential.
 */
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  const schema = {
    openapi: "3.1.0",
    info: {
      title: "SaferSay Reporting (read-only)",
      description:
        "Read-only access to a tenant's k-anonymity-protected survey report. Never returns individual responses, and never returns anything below the tenant's confidentiality threshold.",
      version: "1.0.0",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/report/export": {
        get: {
          operationId: "getSurveyReport",
          summary: "Get the latest (or a specific) protected survey report for the authenticated tenant.",
          parameters: [
            { name: "cycleId", in: "query", required: false, schema: { type: "string" }, description: "Specific survey cycle id. Omit for the tenant's latest cycle." },
            { name: "format", in: "query", required: false, schema: { type: "string", enum: ["csv", "json"] }, description: "Defaults to csv." },
          ],
          responses: {
            "200": {
              description: "Report data, or a protected placeholder if the response count is below the tenant's confidentiality threshold.",
              content: { "application/json": { schema: { type: "object" } }, "text/csv": { schema: { type: "string" } } },
            },
            "401": { description: "Missing or invalid API key." },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "A SaferSay tenant API key (create one from Workspace Settings)." },
      },
    },
    security: [{ bearerAuth: [] }],
  };

  return NextResponse.json(schema);
}

/**
 * Thin client for Supabase's Management API, used only to register/
 * deregister a tenant's SAML SSO provider on this project. Distinct from
 * the app's normal Supabase clients (src/utils/supabase/*), which use the
 * project's public URL/key and never touch this API.
 *
 * Requires two operator-provided env vars that this codebase cannot
 * supply on its own:
 *   - SUPABASE_ACCESS_TOKEN: a personal/organization access token with
 *     rights to manage this project (https://supabase.com/dashboard/account/tokens).
 *   - SUPABASE_PROJECT_REF: this project's ref id (the subdomain in its
 *     Supabase dashboard URL).
 * Enterprise SSO (SAML) is also a paid Supabase add-on that must be
 * enabled on the project before any of this will succeed -- when either
 * env var is missing, every call here fails fast with a clear message
 * instead of attempting a request that can't work.
 */

export type SamlProviderInput = {
  domain: string;
  metadataUrl: string | null;
  metadataXml: string | null;
};

export type SamlProviderResult = { providerId: string };

class SupabaseManagementApiNotConfiguredError extends Error {
  constructor() {
    super(
      "SSO isn't connected to Supabase yet. The platform operator needs to set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF, and enable the SAML SSO add-on on this project, before tenants can register an identity provider."
    );
  }
}

function requireManagementApiConfig() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!accessToken || !projectRef) throw new SupabaseManagementApiNotConfiguredError();
  return { accessToken, projectRef };
}

async function managementApiFetch(path: string, init: RequestInit) {
  const { accessToken, projectRef } = requireManagementApiConfig();
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}${path}`, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Supabase Management API request failed (${response.status}): ${body || response.statusText}`);
  }
  return response;
}

export async function registerSamlProvider(input: SamlProviderInput): Promise<SamlProviderResult> {
  if (!input.metadataUrl && !input.metadataXml) {
    throw new Error("Provide either an IdP metadata URL or metadata XML.");
  }
  const response = await managementApiFetch("/config/auth/sso/providers", {
    method: "POST",
    body: JSON.stringify({
      type: "saml",
      metadata_url: input.metadataUrl || undefined,
      metadata_xml: input.metadataXml || undefined,
      domains: [input.domain],
    }),
  });
  const data = (await response.json()) as { id: string };
  return { providerId: data.id };
}

export async function updateSamlProvider(providerId: string, input: SamlProviderInput): Promise<void> {
  await managementApiFetch(`/config/auth/sso/providers/${providerId}`, {
    method: "PUT",
    body: JSON.stringify({
      metadata_url: input.metadataUrl || undefined,
      metadata_xml: input.metadataXml || undefined,
      domains: [input.domain],
    }),
  });
}

export async function deregisterSamlProvider(providerId: string): Promise<void> {
  await managementApiFetch(`/config/auth/sso/providers/${providerId}`, { method: "DELETE" });
}

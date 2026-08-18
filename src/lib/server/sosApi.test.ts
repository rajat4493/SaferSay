import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("SOS availability route", () => {
  const route = readFileSync("src/app/api/respondent/sos-availability/route.ts", "utf8");

  it("gates availability on a real per-tenant DB check, not a static flag", () => {
    expect(route).toContain("getSafetyContactEmail");
    expect(route).toContain("findIssuedToken");
  });

  it("never claims available for an unresolved token", () => {
    const body = route.slice(route.indexOf("if (!participant)"), route.indexOf("if (!participant)") + 150);
    expect(body).toContain("available: false");
  });
});

describe("SOS submit route", () => {
  const route = readFileSync("src/app/api/respondent/sos/route.ts", "utf8");

  it("rejects when consentAck is not exactly true, before any identity lookup or email send", () => {
    const consentCheckIndex = route.indexOf("consentAck !== true");
    // The real call site, not the doc-comment mention of the method name.
    const identityLookupIndex = route.indexOf("repo.findParticipantIdentityForSos(");
    const emailSendIndex = route.indexOf("sendSosAlert(");
    expect(consentCheckIndex).toBeGreaterThan(-1);
    expect(consentCheckIndex).toBeLessThan(identityLookupIndex);
    expect(consentCheckIndex).toBeLessThan(emailSendIndex);
  });

  it("re-checks the safety contact server-side even though the UI already gated on availability", () => {
    expect(route).toContain("getSafetyContactEmail");
    const contactCheckIndex = route.indexOf("getSafetyContactEmail");
    const emailSendIndex = route.indexOf("sendSosAlert(");
    expect(contactCheckIndex).toBeLessThan(emailSendIndex);
  });

  it("never touches responses.* -- the SOS path stays entirely inside identity.*", () => {
    expect(route).not.toContain("ResponseRepository");
    expect(route).not.toMatch(/responses\.\w/); // actual schema.table usage, not the doc-comment prose
  });

  it("does not echo the safety contact's email back to the browser on success", () => {
    const successReturn = route.slice(route.lastIndexOf("return { ok: true"), route.lastIndexOf("return { ok: true") + 60);
    expect(successReturn).not.toContain("safetyContactEmail");
    expect(successReturn).not.toContain("routedToEmail");
  });
});

describe("sosDelivery", () => {
  const delivery = readFileSync("src/lib/server/sosDelivery.ts", "utf8");

  it("is a separate file from resendDelivery.ts's invite/reminder sender", () => {
    const resendDelivery = readFileSync("src/lib/server/resendDelivery.ts", "utf8");
    expect(resendDelivery).not.toContain("sendSosAlert");
    expect(delivery).toContain("sendSosAlert");
  });

  it("includes the non-guarantee disclaimer, since this is the one email allowed to carry real identity", () => {
    expect(delivery).toMatch(/does not guarantee/i);
  });
});

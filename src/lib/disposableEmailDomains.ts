/**
 * Blocks brand-new-tenant self-serve signup with a throwaway/temp-mail
 * address -- see the "self-serve signup has no gate" GA gap: any unknown
 * email could auto-provision a free workspace forever, and a disposable
 * address is the cheapest way to do that at scale (fresh identity, zero
 * cost, no real accountability). Never blocks an existing user or an
 * invited teammate signing in -- see resolveUserRecord in authSession.ts,
 * which only calls this on the "nobody has ever seen this email" path.
 *
 * Deliberately a plain domain list, not a live third-party lookup API --
 * this only needs to catch the well-known, high-volume disposable-mail
 * providers, not achieve perfect coverage, and a hardcoded list has no
 * external dependency to fail or add latency to the signup path.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.de",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "yopmail.com",
  "yopmail.net",
  "yopmail.fr",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "mailnesia.com",
  "mailcatch.com",
  "fakeinbox.com",
  "spamgourmet.com",
  "mytemp.email",
  "moakt.com",
  "emailondeck.com",
  "mohmal.com",
  "inboxkitten.com",
  "discard.email",
  "discardmail.com",
  "mintemail.com",
]);

export function isDisposableEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

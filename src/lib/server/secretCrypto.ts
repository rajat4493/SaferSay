import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const developmentSecret = "local-development-secret-crypto-key";

/**
 * AES-256-GCM at-rest encryption for tenant-supplied credentials (SMTP
 * passwords -- see identity.tenant_settings.smtp_password_encrypted).
 * Never used for respondent tokens or API keys, which are hashed, not
 * encrypted, since those only need to be *verified*, never read back.
 * SMTP credentials must be read back to actually send mail, so this is
 * genuinely reversible encryption, not a hash.
 */
function getKey() {
  const secret = process.env.SECRET_ENCRYPTION_KEY || developmentSecret;
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

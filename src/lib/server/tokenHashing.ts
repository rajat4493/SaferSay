import { createHash } from "crypto";

const developmentTokenSecret = "local-development-token-secret";
const placeholderTokenSecret = "replace-with-a-long-random-secret";

export function hasProductionTokenSecret() {
  return Boolean(
    process.env.TOKEN_SECRET &&
      process.env.TOKEN_SECRET !== placeholderTokenSecret &&
      process.env.TOKEN_SECRET !== developmentTokenSecret &&
      process.env.TOKEN_SECRET.length >= 32,
  );
}

export function requireTokenSecret() {
  if (hasProductionTokenSecret()) return process.env.TOKEN_SECRET!;
  if (process.env.DATABASE_URL) {
    throw new Error("TOKEN_SECRET is required before issuing or spending database-backed respondent tokens.");
  }
  return developmentTokenSecret;
}

export function hashServerToken(rawToken: string) {
  return createHash("sha256").update(`${requireTokenSecret()}:${rawToken}`).digest("hex");
}

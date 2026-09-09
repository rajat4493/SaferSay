import { describe, expect, it } from "vitest";
import { isDisposableEmailDomain } from "./disposableEmailDomains";

describe("isDisposableEmailDomain", () => {
  it("flags well-known temp-mail domains, case-insensitively", () => {
    expect(isDisposableEmailDomain("someone@mailinator.com")).toBe(true);
    expect(isDisposableEmailDomain("someone@MAILINATOR.COM")).toBe(true);
    expect(isDisposableEmailDomain("someone@Guerrillamail.com")).toBe(true);
    expect(isDisposableEmailDomain("someone@yopmail.com")).toBe(true);
  });

  it("does not flag ordinary work/personal email domains", () => {
    expect(isDisposableEmailDomain("owner@nimbusrobotics.example")).toBe(false);
    expect(isDisposableEmailDomain("someone@gmail.com")).toBe(false);
    expect(isDisposableEmailDomain("someone@outlook.com")).toBe(false);
    expect(isDisposableEmailDomain("someone@acme.co")).toBe(false);
  });

  it("does not false-positive on a domain merely containing a blocked substring", () => {
    expect(isDisposableEmailDomain("someone@notmailinator.com")).toBe(false);
    expect(isDisposableEmailDomain("someone@mailinator.com.example.org")).toBe(false);
  });

  it("handles malformed input without throwing", () => {
    expect(isDisposableEmailDomain("not-an-email")).toBe(false);
    expect(isDisposableEmailDomain("")).toBe(false);
  });
});

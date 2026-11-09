import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptSession, encryptSession, type StoredSession } from "./token-vault";

const record: StoredSession = {
  version: 1,
  email: "test@example.com",
  subject: "synthetic-test-subject",
  accessToken: "fake-access-token",
  refreshToken: "fake-refresh-token",
  accessExpiresAt: 1790000000000,
  expiresAt: 1790000500000,
};

describe("encrypted server-side Google sessions", () => {
  it("round-trips using AES-256-GCM without exposing tokens", () => {
    const key = randomBytes(32);
    const encrypted = encryptSession(record, key);
    expect(encrypted).not.toContain(record.refreshToken);
    expect(decryptSession(encrypted, key)).toEqual(record);
    expect(decryptSession(encrypted, randomBytes(32))).toBeNull();
  });
  it("rejects authentication-tag tampering and malformed records", () => {
    const key = randomBytes(32);
    const encrypted = encryptSession(record, key);
    const tampered = encrypted.slice(0, -1) + (encrypted.at(-1) === "A" ? "B" : "A");
    expect(decryptSession(tampered, key)).toBeNull();
    expect(decryptSession("invalid", key)).toBeNull();
    expect(() => encryptSession(record, randomBytes(16))).toThrow();
  });
});

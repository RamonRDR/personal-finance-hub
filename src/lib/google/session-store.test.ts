import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { findSession, newSessionHandle, revokeSession, saveSession } from "./session-store";
import type { GoogleConfig } from "./config";
import type { StoredSession } from "./token-vault";

vi.mock("server-only", () => ({}));

const config: GoogleConfig = {
  origin: "https://example.com",
  clientId: "fake-client",
  clientSecret: "fake-secret",
  allowedEmail: "owner@example.com",
  spreadsheetId: "fake-workbook-identifier-00001",
  encryptionKey: randomBytes(32),
  redisUrl: "https://example.upstash.io",
  redisToken: "fake-redis-token",
};

const sample = (): StoredSession => ({
  version: 1,
  email: "owner@example.com",
  subject: "synthetic-identity",
  accessToken: "synthetic-access-token",
  refreshToken: "synthetic-refresh-token",
  accessExpiresAt: Date.now() + 30_000,
  expiresAt: Date.now() + 90_000,
});

const entries = new Map<string, string>();

beforeEach(() => {
  entries.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options: RequestInit) => {
      const [command, key, value] = JSON.parse(String(options.body)) as string[];
      let result: unknown = null;
      if (command === "SET") {
        entries.set(key, value);
        result = "OK";
      } else if (command === "GET") {
        result = entries.get(key) ?? null;
      } else if (command === "DEL") {
        result = entries.delete(key) ? 1 : 0;
      }
      return { ok: true, json: async () => ({ result }) };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("encrypted Redis session boundary", () => {
  it("stores ciphertext under a hashed opaque handle and supports logout", async () => {
    const handle = newSessionHandle();
    const original = sample();
    await saveSession(handle, original, config);
    const [redisKey, encrypted] = [...entries.entries()][0];
    expect(handle).toHaveLength(43);
    expect(redisKey).not.toContain(handle);
    expect(encrypted).not.toContain(original.refreshToken);
    expect(await findSession(handle, config)).toEqual(original);
    await revokeSession(handle, config);
    expect(await findSession(handle, config)).toBeNull();
  });

  it("rejects invalid handles, expired records and unauthorized identities", async () => {
    expect(await findSession("forged-handle", config)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    await expect(
      saveSession(newSessionHandle(), { ...sample(), expiresAt: Date.now() - 1000 }, config),
    ).rejects.toThrow("Expired session");
    const handle = newSessionHandle();
    await saveSession(handle, sample(), config);
    expect(await findSession(handle, { ...config, allowedEmail: "different@example.com" }))
      .toBeNull();
  });

  it("fails closed when encrypted storage is corrupted", async () => {
    const handle = newSessionHandle();
    await saveSession(handle, sample(), config);
    const key = [...entries.keys()][0];
    entries.set(key, "corrupted-ciphertext");
    expect(await findSession(handle, config)).toBeNull();
  });
});

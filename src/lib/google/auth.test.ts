import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { GoogleConfig } from "./config";
import type { StoredSession } from "./token-vault";
import { authorizedGoogleToken, exchangeGoogleCode } from "./auth";
import { findSession, revokeSession, saveSession } from "./session-store";

vi.mock("server-only", () => ({}));
vi.mock("./session-store", () => ({
  findSession: vi.fn(),
  saveSession: vi.fn(),
  revokeSession: vi.fn(),
}));

const config = {
  clientId: "synthetic-id",
  clientSecret: "synthetic-secret",
  allowedEmail: "owner@example.com",
  origin: "https://example.com",
} as GoogleConfig;

const session = (): StoredSession => ({
  version: 1,
  email: "owner@example.com",
  subject: "synthetic-sub",
  accessToken: "old-access",
  refreshToken: "synthetic-refresh",
  accessExpiresAt: Date.now() + 120_000,
  expiresAt: Date.now() + 120_000,
});

const request = {
  cookies: { get: () => ({ value: "synthetic-browser-handle" }) },
} as unknown as NextRequest;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("authorized Google access token", () => {
  it("rejects missing sessions without contacting Google", async () => {
    vi.mocked(findSession).mockResolvedValue(null);
    const google = vi.fn();
    vi.stubGlobal("fetch", google);
    expect(await authorizedGoogleToken(request, config)).toBeNull();
    expect(google).not.toHaveBeenCalled();
  });

  it("uses unexpired access tokens without refresh", async () => {
    vi.mocked(findSession).mockResolvedValue(session());
    const google = vi.fn();
    vi.stubGlobal("fetch", google);
    expect(await authorizedGoogleToken(request, config)).toBe("old-access");
    expect(google).not.toHaveBeenCalled();
  });

  it("refreshes an expiring token on the server and persists rotation", async () => {
    vi.mocked(findSession).mockResolvedValue({
      ...session(),
      accessExpiresAt: Date.now() + 1000,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ access_token: "new-access", expires_in: 3600 }),
      })),
    );
    expect(await authorizedGoogleToken(request, config)).toBe("new-access");
    expect(saveSession).toHaveBeenCalledWith(
      "synthetic-browser-handle",
      expect.objectContaining({
        accessToken: "new-access",
        refreshToken: "synthetic-refresh",
      }),
      config,
    );
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(String(options?.body)).toContain("grant_type=refresh_token");
  });

  it("refuses a failed refresh without leaking stale tokens", async () => {
    vi.mocked(findSession).mockResolvedValue({
      ...session(),
      accessExpiresAt: Date.now() - 1000,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false })),
    );
    expect(await authorizedGoogleToken(request, config)).toBeNull();
    expect(saveSession).not.toHaveBeenCalled();
  });
});

describe("Google token exchange scope verification", () => {
  const scopedResponse = (scope: string) => ({
    ok: true,
    json: async () => ({
      access_token: "synthetic-access",
      refresh_token: "synthetic-refresh",
      expires_in: 3600,
      token_type: "Bearer",
      scope,
    }),
  });

  it("accepts the explicitly granted read-only Sheets scope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        scopedResponse("openid email https://www.googleapis.com/auth/spreadsheets.readonly"),
      ),
    );
    const result = await exchangeGoogleCode(config, "synthetic-code", "synthetic-pkce-verifier");
    expect(result.accessToken).toBe("synthetic-access");
    expect(result.refreshToken).toBe("synthetic-refresh");
  });

  it("rejects an omitted or reduced Sheets grant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => scopedResponse("openid email")),
    );
    await expect(exchangeGoogleCode(config, "synthetic-code", "synthetic-pkce")).rejects.toThrow(
      "read-only Sheets session",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        scopedResponse("openid email https://www.googleapis.com/auth/spreadsheets"),
      ),
    );
    await expect(exchangeGoogleCode(config, "synthetic-code", "synthetic-pkce")).rejects.toThrow();
  });

  it("revokes the local session when Google invalidates its refresh token", async () => {
    vi.mocked(findSession).mockResolvedValue({
      ...session(),
      accessExpiresAt: Date.now() - 1000,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400 })),
    );
    expect(await authorizedGoogleToken(request, config)).toBeNull();
    expect(revokeSession).toHaveBeenCalledWith("synthetic-browser-handle", config);
  });
});

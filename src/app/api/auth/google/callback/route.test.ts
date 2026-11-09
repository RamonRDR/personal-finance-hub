import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { GET } from "./route";
import { googleConfig } from "@/lib/google/config";
import { exchangeGoogleCode, fetchGoogleIdentity } from "@/lib/google/auth";
import { createOAuthFlow } from "@/lib/google/oauth-core";
import { saveSession } from "@/lib/google/session-store";
import type { GoogleConfig } from "@/lib/google/config";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/google/config", () => ({ googleConfig: vi.fn() }));
vi.mock("@/lib/google/auth", () => ({
  FLOW_COOKIE: "pfh_google_flow",
  SESSION_COOKIE: "pfh_session",
  secureCookies: () => true,
  exchangeGoogleCode: vi.fn(),
  fetchGoogleIdentity: vi.fn(),
}));
vi.mock("@/lib/google/session-store", () => ({
  saveSession: vi.fn(),
  newSessionHandle: () => "x".repeat(43),
}));

const config = {
  origin: "https://finance.example",
  clientId: "synthetic-client",
  clientSecret: "synthetic-secret",
  allowedEmail: "owner@example.com",
  encryptionKey: randomBytes(32),
} as GoogleConfig;

const callback = (state: string, flowCookie?: string) =>
  new NextRequest(
    "https://finance.example/api/auth/google/callback?state=" +
      encodeURIComponent(state) +
      "&code=synthetic-code",
    { headers: flowCookie ? { Cookie: "pfh_google_flow=" + flowCookie } : undefined },
  );

beforeEach(() => {
  vi.mocked(googleConfig).mockReturnValue(config);
  vi.mocked(exchangeGoogleCode).mockResolvedValue({
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
    accessExpiresAt: Date.now() + 3600000,
  });
  vi.mocked(fetchGoogleIdentity).mockResolvedValue({
    email: "owner@example.com",
    sub: "synthetic-google-sub",
    email_verified: true,
  });
});

afterEach(() => vi.clearAllMocks());

describe("Google OAuth authorization callback", () => {
  it("completes signed PKCE callback for the exact verified owner", async () => {
    const flow = createOAuthFlow(config.encryptionKey);
    const response = await GET(callback(flow.state, flow.cookie));
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://finance.example/?google=connected");
    expect(response.cookies.get("pfh_session")?.value).toBe("x".repeat(43));
    expect(response.cookies.get("pfh_google_flow")?.value).toBe("");
    expect(saveSession).toHaveBeenCalledWith(
      "x".repeat(43),
      expect.objectContaining({
        email: "owner@example.com",
        refreshToken: "synthetic-refresh",
      }),
      config,
    );
    expect(JSON.stringify(Object.fromEntries(response.headers))).not.toContain("synthetic-access");
  });

  it("blocks missing state, forged state and absent flow cookies before exchanging tokens", async () => {
    const flow = createOAuthFlow(config.encryptionKey);
    const missing = await GET(callback(flow.state));
    const wrong = await GET(callback("wrong-state", flow.cookie));
    expect(missing.headers.get("Location")).toContain("google=error");
    expect(wrong.headers.get("Location")).toContain("google=error");
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
    expect(saveSession).not.toHaveBeenCalled();
  });

  it("refuses foreign and unverified accounts before storing sessions", async () => {
    const flow = createOAuthFlow(config.encryptionKey);
    vi.mocked(fetchGoogleIdentity).mockResolvedValueOnce({
      email: "other@example.com",
      sub: "other-sub",
      email_verified: true,
    });
    const foreign = await GET(callback(flow.state, flow.cookie));
    expect(foreign.headers.get("Location")).toContain("google=denied");
    vi.mocked(fetchGoogleIdentity).mockResolvedValueOnce({
      email: "owner@example.com",
      sub: "owner-sub",
      email_verified: false,
    });
    const unverified = await GET(callback(flow.state, flow.cookie));
    expect(unverified.headers.get("Location")).toContain("google=denied");
    expect(saveSession).not.toHaveBeenCalled();
  });

  it("refuses callbacks when integration is disabled or Google exchange fails", async () => {
    vi.mocked(googleConfig).mockReturnValueOnce(null);
    const disabled = await GET(callback("synthetic-state"));
    expect(disabled.status).toBe(404);
    const flow = createOAuthFlow(config.encryptionKey);
    vi.mocked(exchangeGoogleCode).mockRejectedValueOnce(new Error("fake Google provider detail"));
    const failed = await GET(callback(flow.state, flow.cookie));
    expect(failed.headers.get("Location")).toContain("google=error");
    expect(failed.headers.get("Location")).not.toContain("fake Google provider detail");
    expect(saveSession).not.toHaveBeenCalled();
  });
});

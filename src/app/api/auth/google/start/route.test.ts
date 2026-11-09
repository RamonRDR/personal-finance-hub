import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { GET } from "./route";
import { googleConfig } from "@/lib/google/config";
import { verifyOAuthFlow } from "@/lib/google/oauth-core";
import type { GoogleConfig } from "@/lib/google/config";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/google/config", () => ({ googleConfig: vi.fn() }));
vi.mock("@/lib/google/auth", () => ({
  FLOW_COOKIE: "pfh_google_flow",
  secureCookies: () => true,
}));

const config = {
  origin: "https://finance.example",
  clientId: "synthetic-client",
  encryptionKey: randomBytes(32),
} as GoogleConfig;

beforeEach(() => vi.mocked(googleConfig).mockReturnValue(config));
afterEach(() => vi.clearAllMocks());

describe("OAuth initiation", () => {
  it("starts a signed state and PKCE-S256 flow without credentials in the browser", () => {
    const response = GET();
    expect(response.status).toBe(307);
    const google = new URL(response.headers.get("Location")!);
    expect(google.hostname).toBe("accounts.google.com");
    expect(google.searchParams.get("redirect_uri")).toBe(
      "https://finance.example/api/auth/google/callback",
    );
    expect(google.searchParams.get("scope")).toContain("spreadsheets.readonly");
    expect(google.searchParams.get("scope")).not.toContain("/auth/spreadsheets ");
    expect(google.searchParams.get("code_challenge_method")).toBe("S256");
    const cookieHeader = response.headers.get("set-cookie") ?? "";
    expect(cookieHeader).toMatch(/HttpOnly/i);
    expect(cookieHeader).toMatch(/SameSite=Lax/i);
    expect(cookieHeader).toMatch(/Secure/i);
    const cookieValue = /pfh_google_flow=([^;]+)/.exec(cookieHeader)?.[1];
    const flow = verifyOAuthFlow(cookieValue, config.encryptionKey);
    expect(flow?.state).toBe(google.searchParams.get("state"));
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("responds with 404 when integration is disabled", () => {
    vi.mocked(googleConfig).mockReturnValueOnce(null);
    expect(GET().status).toBe(404);
  });
});

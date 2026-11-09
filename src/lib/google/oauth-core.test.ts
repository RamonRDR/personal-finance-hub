import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  approvedGoogleIdentity,
  buildGoogleAuthorizationUrl,
  createOAuthFlow,
  verifyOAuthFlow,
} from "./oauth-core";

describe("Google OAuth safety", () => {
  const secret = randomBytes(32);
  it("binds a short-lived signed state to a PKCE verifier", () => {
    const flow = createOAuthFlow(secret, 1000);
    expect(verifyOAuthFlow(flow.cookie, secret, 2000)).toMatchObject({
      state: flow.state,
      verifier: flow.verifier,
    });
    const url = new URL(buildGoogleAuthorizationUrl("demo-client", "https://example.com/callback", flow));
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toContain("spreadsheets.readonly");
    expect(url.searchParams.get("scope")).not.toContain("spreadsheets ");
    expect(url.searchParams.get("state")).toBe(flow.state);
    expect(url.searchParams.get("code_challenge")).toBe(flow.challenge);
    expect(verifyOAuthFlow(flow.cookie, secret, 601001)).toBeNull();
  });
  it("rejects tampering and foreign secrets", () => {
    const flow = createOAuthFlow(secret);
    expect(verifyOAuthFlow(flow.cookie + "x", secret)).toBeNull();
    expect(verifyOAuthFlow(flow.cookie, randomBytes(32))).toBeNull();
    expect(verifyOAuthFlow(undefined, secret)).toBeNull();
  });
  it("requires an exact verified Google account", () => {
    const identity = { email: "owner@example.com", sub: "google-user", email_verified: true };
    expect(approvedGoogleIdentity(identity, "OWNER@EXAMPLE.COM")).toEqual({
      email: identity.email,
      subject: identity.sub,
    });
    expect(approvedGoogleIdentity({ ...identity, email_verified: false }, identity.email)).toBeNull();
    expect(approvedGoogleIdentity(identity, "other@example.com")).toBeNull();
    expect(approvedGoogleIdentity({ ...identity, sub: "" }, identity.email)).toBeNull();
  });
});

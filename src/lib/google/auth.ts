import "server-only";
import type { NextRequest } from "next/server";
import type { GoogleConfig } from "./config";
import { findSession, revokeSession, saveSession } from "./session-store";

export const SESSION_COOKIE = "pfh_session";
export const FLOW_COOKIE = "pfh_google_flow";

export function secureCookies(config: GoogleConfig) {
  return config.origin.startsWith("https://");
}

interface OAuthTokenReply {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

const READ_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
function hasReadOnlySheetsPermission(scopes: string | undefined): boolean {
  return typeof scopes === "string" && scopes.split(/\s+/u).includes(READ_SCOPE);
}

export async function exchangeGoogleCode(config: GoogleConfig, code: string, verifier: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.origin + "/api/auth/google/callback",
      code_verifier: verifier,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Google authorization failed");
  const token = (await response.json()) as OAuthTokenReply;
  if (
    !token.access_token ||
    !token.refresh_token ||
    token.token_type !== "Bearer" ||
    !hasReadOnlySheetsPermission(token.scope) ||
    !Number.isFinite(token.expires_in) ||
    !Number.isInteger(token.expires_in) ||
    token.expires_in! <= 0
  ) {
    throw new Error("Google did not grant a renewable read-only Sheets session");
  }
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    accessExpiresAt: Date.now() + Math.max(1, token.expires_in!) * 1000,
  };
}

export async function fetchGoogleIdentity(accessToken: string): Promise<unknown> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: "Bearer " + accessToken },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Google identity verification failed");
  return response.json();
}

export async function authorizedGoogleToken(
  request: NextRequest,
  config: GoogleConfig,
): Promise<string | null> {
  const handle = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await findSession(handle, config);
  if (!session) return null;
  if (session.accessExpiresAt > Date.now() + 60000) return session.accessToken;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: session.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      // A rejected refresh token is invalid or revoked; prevent stale sessions.
      await revokeSession(handle, config);
    }
    return null;
  }
  const next = (await response.json()) as OAuthTokenReply;
  if (
    !next.access_token ||
    !Number.isFinite(next.expires_in) ||
    !Number.isInteger(next.expires_in) ||
    next.expires_in! <= 0 ||
    (next.scope !== undefined && !hasReadOnlySheetsPermission(next.scope))
  ) return null;
  await saveSession(
    handle!,
    {
      ...session,
      accessToken: next.access_token,
      refreshToken: next.refresh_token || session.refreshToken,
      accessExpiresAt: Date.now() + Math.max(1, next.expires_in!) * 1000,
    },
    config,
  );
  return next.access_token;
}

export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
};

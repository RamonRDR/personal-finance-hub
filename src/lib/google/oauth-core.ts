import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/spreadsheets.readonly";
export const FLOW_MAX_AGE_MS = 10 * 60 * 1000;

interface Flow {
  state: string;
  verifier: string;
  expiresAt: number;
}

const random = () => randomBytes(32).toString("base64url");
const signature = (value: string, secret: Buffer) =>
  createHmac("sha256", secret).update(value).digest("base64url");

export function createOAuthFlow(secret: Buffer, now = Date.now()) {
  const flow: Flow = { state: random(), verifier: random(), expiresAt: now + FLOW_MAX_AGE_MS };
  const payload = Buffer.from(JSON.stringify(flow)).toString("base64url");
  const challenge = createHash("sha256").update(flow.verifier).digest("base64url");
  return { ...flow, challenge, cookie: payload + "." + signature(payload, secret) };
}

export function verifyOAuthFlow(
  cookie: string | undefined,
  secret: Buffer,
  now = Date.now(),
): Flow | null {
  if (!cookie || cookie.length > 2048) return null;
  const [payload, mac, extra] = cookie.split(".");
  if (!payload || !mac || extra) return null;
  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!value || typeof value !== "object") return null;
    const flow = value as Partial<Flow>;
    if (
      typeof flow.state !== "string" ||
      typeof flow.verifier !== "string" ||
      typeof flow.expiresAt !== "number" ||
      flow.expiresAt <= now ||
      flow.expiresAt > now + FLOW_MAX_AGE_MS ||
      !/^[A-Za-z0-9_-]{40,100}$/.test(flow.state) ||
      !/^[A-Za-z0-9_-]{40,100}$/.test(flow.verifier)
    )
      return null;
    return flow as Flow;
  } catch {
    return null;
  }
}

export function buildGoogleAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  flow: ReturnType<typeof createOAuthFlow>,
): string {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    state: flow.state,
    code_challenge: flow.challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?" + query.toString();
}

export function approvedGoogleIdentity(
  input: unknown,
  allowedEmail: string,
): { email: string; subject: string } | null {
  if (!input || typeof input !== "object") return null;
  const user = input as Record<string, unknown>;
  if (
    typeof user.email !== "string" ||
    typeof user.sub !== "string" ||
    !user.sub ||
    user.email_verified !== true ||
    user.email.toLowerCase() !== allowedEmail.toLowerCase()
  )
    return null;
  return { email: user.email, subject: user.sub };
}

import { NextRequest, NextResponse } from "next/server";
import { googleConfig } from "@/lib/google/config";
import {
  exchangeGoogleCode,
  fetchGoogleIdentity,
  FLOW_COOKIE,
  secureCookies,
  SESSION_COOKIE,
} from "@/lib/google/auth";
import { approvedGoogleIdentity, verifyOAuthFlow } from "@/lib/google/oauth-core";
import { newSessionHandle, saveSession } from "@/lib/google/session-store";
import { SESSION_LIFETIME_SECONDS } from "@/lib/google/token-vault";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let config;
  try {
    config = googleConfig();
    if (!config) return new Response("Integration disabled", { status: 404 });
  } catch {
    return new Response("Authentication unavailable", { status: 503 });
  }

  const finish = (result: string) => {
    const response = NextResponse.redirect(config.origin + "/?google=" + result);
    response.cookies.delete(FLOW_COOKIE);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };

  try {
    const flow = verifyOAuthFlow(request.cookies.get(FLOW_COOKIE)?.value, config.encryptionKey);
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    if (!flow || !state || state !== flow.state || !code || code.length > 4096) {
      return finish("error");
    }
    const token = await exchangeGoogleCode(config, code, flow.verifier);
    const identity = approvedGoogleIdentity(
      await fetchGoogleIdentity(token.accessToken),
      config.allowedEmail,
    );
    if (!identity) return finish("denied");
    const handle = newSessionHandle();
    await saveSession(
      handle,
      {
        version: 1,
        email: identity.email,
        subject: identity.subject,
        ...token,
        expiresAt: Date.now() + SESSION_LIFETIME_SECONDS * 1000,
      },
      config,
    );
    const response = finish("connected");
    response.cookies.set(SESSION_COOKIE, handle, {
      httpOnly: true,
      secure: secureCookies(config),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_LIFETIME_SECONDS,
    });
    return response;
  } catch {
    return finish("error");
  }
}

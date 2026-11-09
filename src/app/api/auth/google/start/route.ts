import { NextResponse } from "next/server";
import { googleConfig } from "@/lib/google/config";
import { FLOW_COOKIE, secureCookies } from "@/lib/google/auth";
import { buildGoogleAuthorizationUrl, createOAuthFlow } from "@/lib/google/oauth-core";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const config = googleConfig();
    if (!config) return new Response("Integration disabled", { status: 404 });
    const flow = createOAuthFlow(config.encryptionKey);
    const url = buildGoogleAuthorizationUrl(
      config.clientId,
      config.origin + "/api/auth/google/callback",
      flow,
    );
    const response = NextResponse.redirect(url);
    response.cookies.set(FLOW_COOKIE, flow.cookie, {
      httpOnly: true,
      secure: secureCookies(config),
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return new Response("Authentication unavailable", { status: 503 });
  }
}

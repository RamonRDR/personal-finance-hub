import { NextRequest, NextResponse } from "next/server";
import { googleConfig } from "@/lib/google/config";
import { PRIVATE_HEADERS, SESSION_COOKIE } from "@/lib/google/auth";
import { revokeSession } from "@/lib/google/session-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const config = googleConfig();
    if (!config) return new Response("Integration disabled", { status: 404 });
    if (request.headers.get("origin") !== config.origin) {
      return new Response("Forbidden", { status: 403, headers: PRIVATE_HEADERS });
    }
    await revokeSession(request.cookies.get(SESSION_COOKIE)?.value, config);
    const response = NextResponse.json({ connected: false }, { headers: PRIVATE_HEADERS });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  } catch {
    return new Response("Logout unavailable", { status: 503, headers: PRIVATE_HEADERS });
  }
}

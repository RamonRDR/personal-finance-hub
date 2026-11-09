import { NextRequest, NextResponse } from "next/server";
import { googleConfig } from "@/lib/google/config";
import { PRIVATE_HEADERS, SESSION_COOKIE } from "@/lib/google/auth";
import { findSession } from "@/lib/google/session-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const config = googleConfig();
    if (!config) {
      return NextResponse.json(
        { configured: false, connected: false },
        { headers: PRIVATE_HEADERS },
      );
    }
    const session = await findSession(request.cookies.get(SESSION_COOKIE)?.value, config);
    return NextResponse.json(
      { configured: true, connected: Boolean(session), email: session?.email || null },
      { headers: PRIVATE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { configured: false, connected: false, error: "Authentication unavailable" },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}

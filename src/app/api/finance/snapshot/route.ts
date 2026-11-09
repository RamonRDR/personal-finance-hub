import { NextRequest, NextResponse } from "next/server";
import { googleConfig } from "@/lib/google/config";
import { authorizedGoogleToken, PRIVATE_HEADERS } from "@/lib/google/auth";
import { loadReadOnlyWorkbook } from "@/lib/google/load";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const config = googleConfig();
    if (!config)
      return new Response("Integration disabled", { status: 404, headers: PRIVATE_HEADERS });
    const token = await authorizedGoogleToken(request, config);
    if (!token) {
      return NextResponse.json(
        { error: "Google login required" },
        {
          status: 401,
          headers: PRIVATE_HEADERS,
        },
      );
    }
    const workbook = await loadReadOnlyWorkbook(config.spreadsheetId, token);
    return NextResponse.json(
      {
        ...workbook,
        snapshot: { ...workbook.snapshot, lastSyncedAt: new Date().toISOString() },
        complete: workbook.warnings.length === 0 && workbook.failedTabs.length === 0,
      },
      { headers: PRIVATE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to read the Google workbook; no changes were made" },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}

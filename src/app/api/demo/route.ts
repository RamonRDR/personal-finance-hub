import { NextResponse } from "next/server";
import { demoSnapshot } from "@/lib/demo/data";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json(demoSnapshot,
    { headers: { "Cache-Control":"no-store, private", "X-Demo-Data":"synthetic" } });
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") === "admin" ? "admin" : "public";
  const current = await getCurrentUserProfile(scope);
  return NextResponse.json(
    { authenticated: Boolean(current), role: current?.role ?? null },
    { status: current ? 200 : 401, headers: { "Cache-Control": "private, no-store" } },
  );
}

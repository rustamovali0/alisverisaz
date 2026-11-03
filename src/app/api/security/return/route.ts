import { NextRequest, NextResponse } from "next/server";
import { readBoundedJson } from "@/lib/http/read-json";
import { getDangerState } from "@/lib/security/danger-state";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { dangerRequestContext, securityUnavailableResponse } from "@/lib/security/danger-gate";
import { consumeDangerEntry, dangerCookieNames, issueDangerProofs, validateDangerBridge } from "@/lib/security/danger-proofs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const origin = new URL(request.headers.get("origin") || "");
    if (origin.host !== (request.headers.get("host") || request.nextUrl.host) || (process.env.NODE_ENV === "production" && origin.protocol !== "https:") || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ ok: false }, { status: 403 });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ ok: false }, { status: 400 });
    const context = dangerRequestContext(request), rate = await consumeRateLimit("danger_return", context.ip, 60, 300);
    if (!rate.ok) return NextResponse.json({ ok: false }, { status: rate.status, headers: { "Retry-After": String(rate.retryAfter), "Cache-Control": "no-store" } });
    let body: { proof?: unknown };
    try { body = await readBoundedJson(request, 8192) as typeof body; } catch (e) { return NextResponse.json({ ok: false }, { status: e instanceof RangeError ? 413 : 400 }); }
    const state = await getDangerState();
    if (!state.enabled) return NextResponse.json({ ok: true, next: "/" }, { headers: { "Cache-Control": "no-store" } });
    const transfer = validateDangerBridge(typeof body?.proof === "string" ? body.proof : "", "transfer", state, context);
    if (!transfer || !await consumeDangerEntry(transfer)) return NextResponse.json({ ok: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const next = transfer.next || "/", proofs = issueDangerProofs(state, context, next), names = dangerCookieNames();
    const response = NextResponse.json({ ok: true, next }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    const options = { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const };
    response.cookies.set(names.clearance, proofs.clearance, { ...options, maxAge: Math.min(3600, Math.ceil((state.expiresAt - Date.now()) / 1000)) });
    response.cookies.set(names.entry, proofs.entry, { ...options, maxAge: 90 });
    return response;
  } catch { return securityUnavailableResponse(); }
}

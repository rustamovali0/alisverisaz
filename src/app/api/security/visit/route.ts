import { NextRequest, NextResponse } from "next/server";
import { getDangerState } from "@/lib/security/danger-state";
import { safeDangerNext } from "@/lib/security/danger-policy";
import { dangerCookieNames, issueDangerProofs, issueDangerBridge, validateDangerBridge } from "@/lib/security/danger-proofs";
import { dangerRequestContext, securityUnavailableResponse } from "@/lib/security/danger-gate";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { verifyCaptchaToken } from "@/lib/auth/security";
import { readBoundedJson } from "@/lib/http/read-json";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const host = request.headers.get("host") || request.nextUrl.host;
  try {
    const origin = new URL(request.headers.get("origin") || "");
    if (origin.host !== host || origin.username || origin.password || (process.env.NODE_ENV === "production" && origin.protocol !== "https:") || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ message: "Sorğu qəbul edilmədi." }, { status: 403 });
  } catch { return NextResponse.json({ message: "Sorğu qəbul edilmədi." }, { status: 403 }); }
  if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length") || 0) > 8192) return NextResponse.json({ message: "Sorğu düzgün deyil." }, { status: 400 });
  try {
    const context = dangerRequestContext(request);
    const rate = await consumeRateLimit("danger_visit:ip", context.ip, 60, 300);
    if (!rate.ok) return NextResponse.json({ message: rate.message }, { status: rate.status, headers: { "Retry-After": String(rate.retryAfter), "Cache-Control": "no-store" } });
    const browserRate = await consumeRateLimit("danger_visit:browser", JSON.stringify(context), 10, 300);
    if (!browserRate.ok) return NextResponse.json({ message: browserRate.message }, { status: browserRate.status, headers: { "Retry-After": String(browserRate.retryAfter), "Cache-Control": "no-store" } });
    let body: { next?: unknown; token?: unknown; transfer?: unknown };
    try { body = await readBoundedJson(request, 8192) as typeof body; if (!body || typeof body !== "object" || Array.isArray(body)) throw Error("invalid"); } catch (error) { return NextResponse.json({ message: "Sorğu düzgün deyil." }, { status: error instanceof RangeError ? 413 : 400 }); }
    const next = safeDangerNext(body.next);
    const state = await getDangerState();
    if (!state.enabled) return NextResponse.json({ ok: true, next }, { headers: { "Cache-Control": "no-store" } });
    const intent = body.transfer ? validateDangerBridge(typeof body.transfer === "string" ? body.transfer : "", "intent", state, context) : null;
    if (body.transfer && !intent) return NextResponse.json({ message: "Mağazaya qayıdış müddəti bitib. Mağazanı yenidən açın." }, { status: 403 });
    if (typeof body.token !== "string" || body.token.length > 2048) return NextResponse.json({ message: "Yoxlamanı tamamlayın." }, { status: 400 });
    const result = await verifyCaptchaToken(body.token, context.ip, "danger_visit", host.split(":")[0]);
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
    if (intent?.targetHost) return NextResponse.json({ ok: true, transfer: { host: intent.targetHost, proof: issueDangerBridge("transfer", state, { ...context, host: intent.targetHost }, intent.next || "/") } }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    const proofs = issueDangerProofs(state, context, next);
    const response = NextResponse.json({ ok: true, next }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    const names = dangerCookieNames();
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
    response.cookies.set(names.clearance, proofs.clearance, { ...options, maxAge: Math.min(3600, Math.ceil((state.expiresAt - Date.now()) / 1000)) });
    response.cookies.set(names.entry, proofs.entry, { ...options, maxAge: 90 });
    return response;
  } catch { return securityUnavailableResponse(); }
}

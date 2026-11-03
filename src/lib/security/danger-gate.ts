import { NextRequest, NextResponse } from "next/server";
import { resolveClientIp } from "./client-ip";
import { getDangerState } from "./danger-state";
import { dangerExemptPath, safeDangerNext } from "./danger-policy";
import { consumeDangerEntry, dangerCookieNames, validateDangerProof, issueDangerBridge } from "./danger-proofs";

export function dangerRequestContext(request: NextRequest) {
  return { host: (request.headers.get("host") || request.nextUrl.host).toLowerCase(), ip: resolveClientIp(request.headers), userAgent: (request.headers.get("user-agent") || "").slice(0, 1000) };
}
export function securityUnavailableResponse() {
  return NextResponse.json({ ok: false, message: "Təhlükəsizlik xidməti müvəqqəti əlçatan deyil. Bir az sonra yenidən cəhd edin." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
}
export async function dangerGate(request: NextRequest, pathname: string, customDomain = false): Promise<{ response: NextResponse | null; consumeEntry?: boolean; active?: boolean }> {
  if (dangerExemptPath(pathname)) return { response: null };
  try {
    const state = await getDangerState();
    if (!state.enabled) return { response: null };
    const names = dangerCookieNames(), context = dangerRequestContext(request);
    const clearance = validateDangerProof(request.cookies.get(names.clearance)?.value, "clearance", state, context);
    const documentRequest = ["GET", "HEAD"].includes(request.method) && !pathname.startsWith("/api/") && request.headers.get("rsc") !== "1";
    if (clearance) {
      if (!documentRequest) return { response: null, active: true };
      const entry = validateDangerProof(request.cookies.get(names.entry)?.value, "entry", state, context);
      if (entry && entry.next === safeDangerNext(pathname + request.nextUrl.search) && await consumeDangerEntry(entry)) return { response: null, consumeEntry: true, active: true };
    }
    const next = safeDangerNext(pathname + request.nextUrl.search);
    let url = new URL("/security-check", process.env.NODE_ENV === "production" ? `https://${context.host}` : request.nextUrl.origin);
    url.searchParams.set("next", next);
    if (customDomain) {
      const central = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://alisveris.az");
      url = new URL("/security-check", central.origin);
      url.searchParams.set("transfer", issueDangerBridge("intent", state, context, next));
    }
    const response = documentRequest
      ? NextResponse.redirect(url, 307)
      : NextResponse.json({ ok: false, securityCheckRequired: true, checkUrl: customDomain ? url.toString() : url.pathname + url.search, message: "Davam etmək üçün təhlükəsizlik yoxlamasını tamamlayın." }, { status: 403 });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return { response };
  } catch { return { response: securityUnavailableResponse() }; }
}

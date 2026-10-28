import { NextResponse, type NextRequest } from "next/server";

import {
  assertAuthRateLimit,
  getClientIp,
  recordAuthRateLimitAttempt,
} from "@/lib/auth/security";
import {
  getPopularMarketplaceSearches,
  normalizeMarketplaceSearchTerm,
} from "@/lib/search/data";
import { readBoundedJson } from "@/lib/http/read-json";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  let searches: string[] = [];

  try {
    searches = await getPopularMarketplaceSearches();
  } catch {
    // Popular-search discovery must not affect the primary search flow.
  }

  return NextResponse.json(
    { searches },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse(null, { status: 403 });
  }

  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return new NextResponse(null, { status: 415 });
  }
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    return new NextResponse(null, { status: error instanceof RangeError ? 413 : 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as { term?: unknown }).term !== "string") {
    return new NextResponse(null, { status: 400 });
  }
  const term = normalizeMarketplaceSearchTerm((body as { term: string }).term);

  if (term.length < 2) {
    return new NextResponse(null, { status: 204 });
  }

  const ip = await getClientIp();
  const rateLimitRule = {
    endpoint: "marketplace_search" as const,
    identifier: term,
    ip,
    maxAttempts: 60,
    windowSeconds: 60,
    blockSeconds: 2 * 60,
  };
  const rateLimit = await assertAuthRateLimit(rateLimitRule);

  if (!rateLimit.ok) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    await recordAuthRateLimitAttempt(rateLimitRule);
    await (supabase as any).rpc("record_marketplace_search", {
      search_term: term,
    });
  } catch {
    // Search tracking must never interrupt the user's search navigation.
  }

  return new NextResponse(null, { status: 204 });
}

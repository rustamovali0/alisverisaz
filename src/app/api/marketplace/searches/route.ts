import { NextResponse, type NextRequest } from "next/server";

import {
  getPopularMarketplaceSearches,
  normalizeMarketplaceSearchTerm,
} from "@/lib/search/data";
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

  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse(null, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const term = normalizeMarketplaceSearchTerm(body?.term);

  if (term.length < 2) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    await (supabase as any).rpc("record_marketplace_search", {
      search_term: term,
    });
  } catch {
    // Search tracking must never interrupt the user's search navigation.
  }

  return new NextResponse(null, { status: 204 });
}

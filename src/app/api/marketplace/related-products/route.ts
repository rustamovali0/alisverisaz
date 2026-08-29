import { NextResponse, type NextRequest } from "next/server";

import { getSimilarMarketplaceProductPage } from "@/lib/cart/data";

function clampLimit(value: string | null) {
  const limit = Number(value ?? "50");

  if (!Number.isFinite(limit)) {
    return 50;
  }

  return Math.min(Math.max(Math.floor(limit), 1), 50);
}

function cleanParam(value: string | null, maxLength = 120) {
  return value ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = clampLimit(searchParams.get("limit"));

  try {
    const page = await getSimilarMarketplaceProductPage(
      searchParams.get("locale") ?? "az",
      {
        productId: cleanParam(searchParams.get("productId"), 80),
        categoryId: cleanParam(searchParams.get("categoryId"), 80),
        cursor: cleanParam(searchParams.get("cursor"), 200) || null,
        limit,
      },
    );

    return NextResponse.json(page, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { products: [], nextCursor: null, hasMore: false },
      { status: 400 },
    );
  }
}

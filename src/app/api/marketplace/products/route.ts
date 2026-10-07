import { NextResponse, type NextRequest } from "next/server";

import { getMarketplaceProductPage } from "@/lib/cart/data";

function clampLimit(value: string | null) {
  const limit = Number(value ?? "24");

  if (!Number.isFinite(limit)) {
    return 24;
  }

  return Math.min(Math.max(Math.floor(limit), 1), 24);
}

function cleanParam(value: string | null, maxLength = 120) {
  return value ? value.trim().slice(0, maxLength) : undefined;
}

function cleanParamList(value: string | null, maxItems = 40, maxLength = 80) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = clampLimit(searchParams.get("limit"));

  try {
    const page = await getMarketplaceProductPage(searchParams.get("locale") ?? "az", {
      categoryId: cleanParam(searchParams.get("categoryId"), 80),
      categoryIds: cleanParamList(searchParams.get("categoryIds")),
      searchQuery: cleanParam(searchParams.get("q"), 120),
      storeId: cleanParam(searchParams.get("storeId"), 80),
      cursor: cleanParam(searchParams.get("cursor"), 200) ?? null,
      sort: cleanParam(searchParams.get("sort"), 40) ?? null,
      limit,
    });

    return NextResponse.json(page, {
      headers: {
        "Cache-Control": searchParams.get("q")
          ? "no-store"
          : "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json(
      {
        products: [],
        nextCursor: null,
        hasMore: false,
      },
      { status: 400 },
    );
  }
}

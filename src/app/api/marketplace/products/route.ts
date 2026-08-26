import { NextResponse, type NextRequest } from "next/server";

import { getMarketplaceProductPage } from "@/lib/cart/data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitValue = Number(searchParams.get("limit") ?? "50");

  try {
    const page = await getMarketplaceProductPage(searchParams.get("locale") ?? "az", {
      categoryId: searchParams.get("categoryId") ?? undefined,
      searchQuery: searchParams.get("q") ?? undefined,
      storeId: searchParams.get("storeId") ?? undefined,
      cursor: searchParams.get("cursor"),
      sort: searchParams.get("sort"),
      limit: Number.isFinite(limitValue) ? limitValue : 50,
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

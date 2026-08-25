import { NextResponse, type NextRequest } from "next/server";

import { getSimilarMarketplaceProductPage } from "@/lib/cart/data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitValue = Number(searchParams.get("limit") ?? "20");

  try {
    const page = await getSimilarMarketplaceProductPage(
      searchParams.get("locale") ?? "az",
      {
        productId: searchParams.get("productId") ?? "",
        categoryId: searchParams.get("categoryId") ?? "",
        cursor: searchParams.get("cursor"),
        limit: Number.isFinite(limitValue) ? limitValue : 20,
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

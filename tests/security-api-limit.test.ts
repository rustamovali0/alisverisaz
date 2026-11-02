import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/marketplace/products/route";
const m = vi.hoisted(() => ({ limit: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/auth/security", () => ({
  getClientIp: async () => "203.0.113.1",
}));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit: m.limit }));
vi.mock("@/lib/cart/data", () => ({ getMarketplaceProductPage: m.query }));
beforeEach(() => m.query.mockResolvedValue({ products: [], hasMore: false }));
it.each([429, 503])(
  "returns %s and Retry-After without executing a database search",
  async (status) => {
    m.limit.mockResolvedValue({
      ok: false,
      status,
      retryAfter: 35,
      message: "Bir az sonra yenidən cəhd edin.",
    });
    const r = await GET(
      new NextRequest(
        "https://shop.example.test/api/marketplace/products?q=test",
      ),
    );
    expect(r.status).toBe(status);
    expect(r.headers.get("retry-after")).toBe("35");
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(m.query).not.toHaveBeenCalled();
  },
);
it("allows a valid request under its shared budget", async () => {
  m.limit.mockResolvedValue({ ok: true });
  expect(
    (
      await GET(
        new NextRequest("https://shop.example.test/api/marketplace/products"),
      )
    ).status,
  ).toBe(200);
  expect(m.query).toHaveBeenCalledTimes(1);
});

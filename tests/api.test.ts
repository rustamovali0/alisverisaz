import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as webhook } from "@/app/api/telegram/webhook/route";
import { GET as products } from "@/app/api/marketplace/products/route";
import { GET as related } from "@/app/api/marketplace/related-products/route";

const mocks = vi.hoisted(() => ({ handle: vi.fn(), products: vi.fn(), related: vi.fn() }));
vi.mock("@/lib/config/env.server", () => ({ serverEnv: { telegramWebhookSecret: "test-secret" } }));
vi.mock("@/lib/telegram/admin-bot", () => ({ handleTelegramAdminUpdate: mocks.handle, isTelegramUpdate: () => false }));
vi.mock("@/lib/cart/data", () => ({ getMarketplaceProductPage: mocks.products, getSimilarMarketplaceProductPage: mocks.related }));
beforeEach(() => {
  mocks.products.mockResolvedValue({ products: [], nextCursor: null, hasMore: false });
  mocks.related.mockResolvedValue({ products: [], nextCursor: null, hasMore: false });
});
it.each([undefined, "wrong-secret"])("rejects an unauthenticated Telegram webhook (%s)", async (secret) => {
  const response = await webhook(new Request("https://shop.example.test/api/telegram/webhook", { method: "POST", body: "{}", headers: secret ? { "x-telegram-bot-api-secret-token": secret } : {} }));
  expect(response.status).toBe(403);
  expect(mocks.handle).not.toHaveBeenCalled();
});
it("rejects malformed Telegram JSON even with the correct secret", async () => {
  const response = await webhook(new Request("https://shop.example.test/api/telegram/webhook", { method: "POST", body: "{", headers: { "x-telegram-bot-api-secret-token": "test-secret" } }));
  expect(response.status).toBe(400);
});
it.each([["999999999", 52], ["-100", 1], ["NaN", 52], ["2.5", 2]])("bounds public product limit %s", async (limit, expected) => {
  expect((await products(new NextRequest(`https://shop.example.test/api/marketplace/products?limit=${limit}`))).status).toBe(200);
  expect(mocks.products).toHaveBeenCalledWith("az", expect.objectContaining({ limit: expected }));
});
it("truncates search input and disables caching for queries", async () => {
  const response = await products(new NextRequest(`https://shop.example.test/api/marketplace/products?q=${"x".repeat(500)}`));
  expect(mocks.products).toHaveBeenCalledWith("az", expect.objectContaining({ searchQuery: "x".repeat(120) }));
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("does not expose internal query failures to public API clients", async () => {
  mocks.related.mockRejectedValue(new Error("private database detail"));
  const response = await related(new NextRequest("https://shop.example.test/api/marketplace/related-products?limit=9999"));
  expect(response.status).toBe(400);
  expect(await response.text()).not.toContain("private database detail");
});

import { beforeEach, expect, it, vi } from "vitest";
import { notifyPromotionRequestSubmitted } from "@/lib/promotions/notifications";
import type { PromotionRequest } from "@/lib/promotions/types";
import { query } from "./query";

const mocks = vi.hoisted(() => ({ from: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/telegram/api", () => ({ sendTelegramMessage: mocks.send, escapeHtml: (value: unknown) => String(value).replaceAll("<", "&lt;") }));
const request: PromotionRequest = {
  id: "request-1", requesterId: "seller-1", targetType: "store", storeId: "store-1", storeName: "Montana", storeSlug: "montana", productId: null, productName: null,
  status: "pending", requestedDays: 3, dailyPriceAmount: 5, totalAmount: 15, currency: "AZN", startsAt: null, endsAt: null, sellerNote: null, adminNote: null,
  requesterName: "Seller", requesterEmail: "seller@example.test", createdAt: "2026-10-06T00:00:00Z",
};
beforeEach(() => { mocks.from.mockReset(); mocks.send.mockResolvedValue(true); });
it("writes an RAdmin notification and sends Telegram a direct admin link", async () => {
  const insert = query();
  mocks.from.mockReturnValueOnce(query({ data: [{ id: "admin-1" }] })).mockReturnValueOnce(insert);
  expect(await notifyPromotionRequestSubmitted(request)).toEqual({ telegramSent: true });
  expect(insert.insert).toHaveBeenCalledWith([expect.objectContaining({ user_id: "admin-1", data: expect.objectContaining({ href: "/radmin/promotions" }) })]);
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("https://shop.example.test/radmin/promotions") }));
});
it("still sends Telegram when creating an in-app notification throws", async () => {
  mocks.from.mockImplementation(() => { throw new Error("notification storage unavailable"); });
  expect(await notifyPromotionRequestSubmitted(request)).toEqual({ telegramSent: true });
  expect(mocks.send).toHaveBeenCalled();
});

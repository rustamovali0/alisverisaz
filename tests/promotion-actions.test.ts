import { beforeEach, expect, it, vi } from "vitest";
import { createPromotionRequestAction } from "@/lib/promotions/actions";
import { query } from "./query";

const mocks = vi.hoisted(() => ({ from: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRole: async () => ({ user: { id: "seller-1", email: "seller@example.test" }, profile: { full_name: "Seller" } }) }));
vi.mock("@/lib/dashboard/data", () => ({ getOwnedStores: async () => [{ id: "12345678-1234-4234-8234-123456789abc", name: "Montana", slug: "montana" }] }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/promotions/data", () => ({ getPromotionRequestById: vi.fn() }));
vi.mock("@/lib/promotions/notifications", () => ({ notifyPromotionRequestSubmitted: mocks.notify, notifyPromotionRequestResolved: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/cache/public-cache", () => ({ invalidateHomepagePublicData: vi.fn(), invalidateProductPublicData: vi.fn(), invalidateStorePublicData: vi.fn() }));

function request() {
  const form = new FormData();
  form.set("targetType", "store");
  form.set("storeId", "12345678-1234-4234-8234-123456789abc");
  form.set("requestedDays", "3");
  return form;
}
beforeEach(() => {
  mocks.from.mockReset();
  mocks.notify.mockResolvedValue({ telegramSent: true });
});
it("saves the pending request and sends its details without requiring another hydration query", async () => {
  const insert = query({ data: { id: "request-1" } });
  mocks.from.mockReturnValueOnce(query({ data: [] })).mockReturnValueOnce(insert);
  expect(await createPromotionRequestAction(request())).toMatchObject({ ok: true });
  expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ requester_id: "seller-1", target_type: "store", total_amount: 15 }));
  expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ id: "request-1", storeName: "Montana", requesterEmail: "seller@example.test" }));
});
it("explains the missing SQL instead of attempting to create an unsaved request", async () => {
  mocks.from.mockReturnValue(query({ error: { code: "PGRST205" } }));
  expect(await createPromotionRequestAction(request())).toMatchObject({ ok: false, message: expect.stringContaining("SQL") });
  expect(mocks.notify).not.toHaveBeenCalled();
});
it("does not claim Telegram delivery when the saved request could not be notified", async () => {
  mocks.from.mockReturnValueOnce(query({ data: [] })).mockReturnValueOnce(query({ data: { id: "request-1" } }));
  mocks.notify.mockResolvedValue({ telegramSent: false });
  expect(await createPromotionRequestAction(request())).toMatchObject({ ok: true, message: expect.stringContaining("çatdırılmadı") });
});

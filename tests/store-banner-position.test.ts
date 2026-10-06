import { beforeEach, expect, it, vi } from "vitest";
import { updateSellerStoreSettingsAction } from "@/lib/store-settings/actions";
import { query } from "./query";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRole: async () => ({ user: { id: "seller-1" } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ from: mocks.from }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/cache/public-cache", () => ({ invalidateStorePublicData: vi.fn() }));
vi.mock("@/lib/storage/media-assets", () => ({ deleteR2MediaAssetsByUrls: vi.fn(), recordImageMediaAsset: vi.fn() }));
vi.mock("@/lib/storage/r2", () => ({ uploadImageToR2: vi.fn() }));
beforeEach(() => { mocks.from.mockReset(); });
function form(x: string, y: string) {
  const data = new FormData();
  data.set("storeId", "store-1"); data.set("name", "Montana");
  data.set("bannerPositionX", x); data.set("bannerPositionY", y);
  return data;
}
it("saves banner positioning while preserving other store settings", async () => {
  const write = query();
  mocks.from.mockReturnValueOnce(query({ data: { id: "store-1", slug: "montana", settings: { customStorefrontEnabled: true, heroTitle: "Montana" } } })).mockReturnValueOnce(write);
  expect(await updateSellerStoreSettingsAction(form("20", "80"))).toMatchObject({ ok: true });
  expect(write.update).toHaveBeenCalledWith(expect.objectContaining({ settings: { customStorefrontEnabled: true, heroTitle: "Montana", bannerPositionX: 20, bannerPositionY: 80 } }));
  expect(write.eq).toHaveBeenCalledWith("owner_id", "seller-1");
});
it.each(["101", "-1", "NaN", "Infinity"])("rejects invalid banner positions (%s)", async (value) => {
  expect(await updateSellerStoreSettingsAction(form(value, "50"))).toMatchObject({ ok: false });
  expect(mocks.from).not.toHaveBeenCalled();
});

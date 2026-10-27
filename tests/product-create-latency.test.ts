import { beforeEach, expect, it, vi } from "vitest";
import { query } from "./query";

const mocks = vi.hoisted(() => ({
  role: vi.fn(), stores: vi.fn(), limit: vi.fn(), notify: vi.fn(),
  approval: vi.fn(), server: vi.fn(), from: vi.fn(),
  afterTasks: [] as Array<() => Promise<void>>,
}));
vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => mocks.afterTasks.push(task) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/auth/session", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/cms/data", () => ({ getSellerFeatureAccess: async () => true }));
vi.mock("@/lib/dashboard/data", () => ({ getOwnedStores: mocks.stores }));
vi.mock("@/lib/subscriptions/data", () => ({ canCreateListing: mocks.limit, getStoreEntitlements: vi.fn(() => { throw new Error("Duplicate entitlements query"); }) }));
vi.mock("@/lib/products/approval-settings", () => ({ getProductApprovalSettings: mocks.approval }));
vi.mock("@/lib/products/approval-notifications", () => ({ notifyProductSubmitted: mocks.notify }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ from: mocks.from }) }));
import { createStoreProductAction } from "@/lib/products/actions";

function form() {
  const data = new FormData();
  Object.entries({ storeId: "store-1", categoryId: "category-1", name: "Test məhsulu", priceAmount: "20", stockQuantity: "5", status: "active" })
    .forEach(([key, value]) => data.set(key, value));
  return data;
}
beforeEach(() => {
  mocks.afterTasks = [];
  mocks.role.mockResolvedValue({ user: { id: "seller-1", email: "seller@example.test" }, profile: { full_name: "Seller" }, role: "seller" });
  mocks.stores.mockResolvedValue([{ id: "store-1", slug: "seller", status: "active", settings: {} }]);
  mocks.limit.mockResolvedValue({ allowed: true, subscription: { imagesPerProductLimit: 5 } });
  mocks.approval.mockResolvedValue({ requireApproval: true });
  mocks.server.mockResolvedValue({ from: () => query({ data: { id: "product-1" } }) });
  mocks.from.mockImplementation(() => query());
  mocks.notify.mockResolvedValue(undefined);
});
it("returns the persisted product before slow notification delivery starts", async () => {
  const write = query({ data: { id: "product-1" } });
  mocks.server.mockResolvedValue({ from: () => write });
  const result = await createStoreProductAction(form());
  expect(result).toMatchObject({ ok: true, productId: "product-1" });
  expect(write.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "seller-1", store_id: "store-1", status: "draft" }));
  expect(mocks.notify).not.toHaveBeenCalled();
  expect(mocks.afterTasks).toHaveLength(1);
  await mocks.afterTasks[0]();
  expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ productId: "product-1", sellerId: "seller-1" }));
});
it("does not notify or write when the product limit is exhausted", async () => {
  mocks.limit.mockResolvedValue({ allowed: false });
  expect(await createStoreProductAction(form())).toMatchObject({ ok: false });
  expect(mocks.server).not.toHaveBeenCalled();
  expect(mocks.afterTasks).toHaveLength(0);
});
it("keeps store ownership checks ahead of creation", async () => {
  mocks.stores.mockResolvedValue([{ id: "someone-elses-store", status: "active" }]);
  expect(await createStoreProductAction(form())).toMatchObject({ ok: false });
  expect(mocks.limit).not.toHaveBeenCalled();
  expect(mocks.server).not.toHaveBeenCalled();
});
it("rejects too many images using the already verified effective limit", async () => {
  mocks.limit.mockResolvedValue({ allowed: true, subscription: { imagesPerProductLimit: 0 } });
  const data = form();
  data.append("images", new File(["fixture"], "test.png", { type: "image/png" }));
  expect(await createStoreProductAction(data)).toMatchObject({ ok: false, message: "Məhsul şəkil limitiniz dolub." });
  expect(mocks.server).not.toHaveBeenCalled();
});

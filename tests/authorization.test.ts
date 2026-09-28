import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as approvals from "@/lib/products/approval-actions";
import { createStoreProductAction, deleteProductAction, updateProductAction } from "@/lib/products/actions";
import { deleteOrderAction, updateOrderStatusAction } from "@/lib/orders/actions";
import { query } from "./query";

const mocks = vi.hoisted(() => ({ role: vi.fn(), admin: vi.fn(), server: vi.fn(), ownedStores: vi.fn(), feature: vi.fn(), deleteImages: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/auth/session", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));
vi.mock("@/lib/dashboard/data", () => ({ getOwnedStores: mocks.ownedStores }));
vi.mock("@/lib/cms/data", () => ({ getSellerFeatureAccess: mocks.feature }));
vi.mock("@/lib/storage/r2", () => ({ deleteR2ImagesByUrls: mocks.deleteImages, uploadImageToR2: vi.fn() }));

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
beforeEach(() => {
  mocks.role.mockResolvedValue({ role: "seller", user: { id: "seller-1" } });
  mocks.ownedStores.mockResolvedValue([{ id: "store-1" }]);
  mocks.feature.mockResolvedValue(true);
});

describe("privileged action authorization", () => {
  it.each(Object.entries(approvals))("requires an admin before %s accesses the database", async (_name, action) => {
    mocks.role.mockRejectedValue(new Error("denied"));
    await expect(action(new FormData())).rejects.toThrow("denied");
    expect(mocks.role).toHaveBeenCalledWith(["admin"], "/radmin/new-products");
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("keeps the internal notification helper out of the Server Action module", () => {
    expect(approvals).not.toHaveProperty("notifyProductSubmitted");
    const source = readFileSync(new URL("../src/lib/products/approval-notifications.ts", import.meta.url), "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).not.toMatch(/["']use server["']/);
  });
  it.each([deleteProductAction, updateProductAction])("rejects changes to another seller's product", async (action) => {
    const q = query({ data: { id: "foreign-product", owner_id: "seller-2", store_id: "store-2", stores: { owner_id: "seller-2" } } });
    mocks.server.mockResolvedValue({ from: () => q });
    const result = await action(form({ productId: "foreign-product", name: "QA product", priceAmount: "20", stockQuantity: "1" }));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("icazəniz yoxdur");
    expect(q.update).not.toHaveBeenCalled();
    expect(q.delete).not.toHaveBeenCalled();
    expect(mocks.deleteImages).not.toHaveBeenCalled();
  });
  it("rejects creating a product in an unowned store", async () => {
    const result = await createStoreProductAction(form({ storeId: "store-2", name: "QA product", priceAmount: "20" }));
    expect(result.ok).toBe(false);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it.each([deleteOrderAction, updateOrderStatusAction])("limits order lookup to owned stores and rejects a foreign order", async (action) => {
    const q = query({ data: [] });
    mocks.admin.mockReturnValue({ from: () => q });
    expect((await action(form({ orderId: "foreign-order", status: "canceled" }))).ok).toBe(false);
    expect(q.in).toHaveBeenCalledWith("store_id", ["store-1"]);
    expect(q.update).not.toHaveBeenCalled();
    expect(q.delete).not.toHaveBeenCalled();
  });
  it("rejects a seller-only status escalation to refunded", async () => {
    expect((await updateOrderStatusAction(form({ orderId: "order-1", status: "refunded" }))).ok).toBe(false);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("enforces the product feature switch before any mutation", async () => {
    mocks.feature.mockResolvedValue(false);
    expect((await deleteProductAction(form({ productId: "product-1" }))).ok).toBe(false);
    expect(mocks.server).not.toHaveBeenCalled();
  });
});

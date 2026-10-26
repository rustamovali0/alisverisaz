import { beforeEach, expect, it, vi } from "vitest";
import { query } from "./query";
const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  server: vi.fn(),
  admin: vi.fn(),
  audit: vi.fn(),
  getProducts: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.server,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.admin,
}));
vi.mock("@/lib/admin/audit", () => ({ recordAdminAudit: mocks.audit }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));
vi.mock("@/lib/cache/public-cache", () => ({
  invalidateProductPublicData: vi.fn(),
}));
vi.mock("@/lib/cms/data", () => ({ getSellerFeatureAccess: async () => true }));
import {
  updateProductAction,
  updateProductByAdminAction,
} from "@/lib/products/actions";
const owner = "00000000-0000-4000-8000-000000000002",
  admin = "00000000-0000-4000-8000-000000000001";
function form() {
  const fd = new FormData();
  Object.entries({
    productId: "00000000-0000-4000-8000-000000000003",
    name: "Yenilənmiş məhsul",
    categoryId: "00000000-0000-4000-8000-000000000004",
    priceAmount: "35",
    discountAmount: "5",
    stockQuantity: "12",
    status: "active",
    commerceType: "sale",
  }).forEach(([k, v]) => fd.set(k, v));
  return fd;
}
beforeEach(() => {
  mocks.requireRole.mockResolvedValue({ user: { id: admin }, role: "admin" });
  mocks.audit.mockResolvedValue(undefined);
  const record = {
    id: "00000000-0000-4000-8000-000000000003",
    store_id: "store",
    owner_id: owner,
    listing_type: "store",
    cost_amount: 4,
    name: "Original",
    status: "active",
    metadata: { approval_status: "approved" },
    stores: { slug: "seller", owner_id: owner, settings: {}, status: "active" },
  };
  const read = query({ data: record }),
    write = query();
  mocks.server.mockResolvedValue({
    from: vi.fn().mockReturnValueOnce(read).mockReturnValue(write),
  });
  mocks.admin.mockReturnValue({ from: vi.fn(() => query()) });
});
it("denies a seller at the explicit RAdmin action before any database access", async () => {
  mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));
  await expect(updateProductByAdminAction(form())).rejects.toThrow("FORBIDDEN");
  expect(mocks.requireRole).toHaveBeenCalledWith(["admin"], "/radmin/products");
  expect(mocks.server).not.toHaveBeenCalled();
});
it("allows RAdmin to update another seller's product and records the actor", async () => {
  const result = await updateProductByAdminAction(form());
  expect(result.ok).toBe(true);
  const client = await mocks.server.mock.results[0].value;
  const write = client.from.mock.results[1].value;
  expect(write.update).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Yenilənmiş məhsul",
      price_amount: 35,
      discount_amount: 5,
      stock_quantity: 12,
      cost_amount: 4,
    }),
  );
  const payload = write.update.mock.calls[0][0];
  expect(payload).not.toHaveProperty("owner_id");
  expect(payload).not.toHaveProperty("store_id");
  expect(mocks.audit).toHaveBeenCalledWith(
    expect.objectContaining({
      action: "product.update",
      adminId: admin,
      entityId: form().get("productId"),
    }),
  );
});
it("continues to reject a different seller through the shared update action", async () => {
  mocks.requireRole.mockResolvedValue({
    user: { id: "another-seller" },
    role: "seller",
  });
  const result = await updateProductAction(form());
  expect(result).toMatchObject({
    ok: false,
    message: "Bu məhsul üzərində icazəniz yoxdur.",
  });
  expect(mocks.admin).not.toHaveBeenCalled();
  expect(mocks.audit).not.toHaveBeenCalled();
});

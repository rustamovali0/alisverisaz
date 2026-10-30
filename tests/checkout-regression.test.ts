import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCheckoutOrdersAction,
  createWhatsAppOrderIntentAction,
} from "@/lib/cart/actions";
import { query } from "./query";
const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  products: vi.fn(),
  admin: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  limit: vi.fn(),
  record: vi.fn(),
  after: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserProfile: mocks.profile }));
vi.mock("@/lib/cart/data", () => ({ getCartProducts: mocks.products }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.admin,
}));
vi.mock("@/lib/auth/security", () => ({
  assertAuthRateLimit: mocks.limit,
  recordAuthRateLimitAttempt: mocks.record,
  getClientIp: async () => "203.0.113.1",
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/telegram/notifications", () => ({
  notifyOrderCreated: vi.fn(),
}));
vi.mock("@/lib/activity/events", () => ({ trackActivityEvent: vi.fn() }));
vi.mock("@/lib/whatsapp-orders/data", () => ({
  getGlobalWhatsAppOrderTemplate: async () => "{{products}} {{total}}",
}));
const productId = "11111111-1111-4111-8111-111111111111";
const storeId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const product = {
  id: productId,
  storeId,
  slug: "fixture",
  name: "Fixture",
  priceAmount: 20,
  discountAmount: 0,
  stockQuantity: 10,
  options: [],
  variantCombinations: [],
};
function form(
  items: unknown = [{ productId, quantity: 1 }],
  extra: Record<string, string> = {},
) {
  const f = new FormData();
  Object.entries({
    fullName: "QA Fixture",
    phone: "+994 50 123 45 67",
    deliveryMethod: "pickup",
    checkoutRequestId: requestId,
    items: typeof items === "string" ? items : JSON.stringify(items),
    ...extra,
  }).forEach(([k, v]) => f.set(k, v));
  return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockResolvedValue({
    role: "customer",
    user: { id: "buyer-1", email: "qa@example.test" },
    profile: { full_name: "QA Fixture", phone: "+994 50 123 45 67" },
  });
  mocks.products.mockResolvedValue([product]);
  mocks.limit.mockResolvedValue({ ok: true });
  mocks.record.mockResolvedValue({ isBlocked: false });
  mocks.from.mockImplementation((table: string) =>
    query({
      data:
        table === "stores"
          ? [
              {
                id: storeId,
                name: "QA Store",
                owner_id: "seller-1",
                settings: { orderMethod: "system" },
              },
            ]
          : [],
    }),
  );
  mocks.rpc.mockResolvedValue({
    data: {
      orderIds: ["order-fixture"],
      orders: [
        {
          id: "order-fixture",
          storeId,
          orderNumber: "QA-1",
          totalAmount: 20,
          itemCount: 1,
        },
      ],
    },
    error: null,
  });
  mocks.admin.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
});
describe.each([createCheckoutOrdersAction, createWhatsAppOrderIntentAction])(
  "checkout boundary %s",
  (action) => {
    it.each([0, -1, 1.5, 1001, "2", null])(
      "rejects invalid quantity %s before product/database access",
      async (quantity) => {
        expect((await action(form([{ productId, quantity }]))).ok).toBe(false);
        expect(mocks.products).not.toHaveBeenCalled();
        expect(mocks.admin).not.toHaveBeenCalled();
      },
    );
    it("rejects duplicate lines exceeding the quantity cap", async () => {
      expect(
        (
          await action(
            form([
              { productId, quantity: 600 },
              { productId, quantity: 600 },
            ]),
          )
        ).ok,
      ).toBe(false);
      expect(mocks.products).not.toHaveBeenCalled();
    });
    it("rejects malformed payloads and request IDs", async () => {
      expect((await action(form("{"))).ok).toBe(false);
      expect(
        (await action(form(undefined, { checkoutRequestId: "not-a-uuid" }))).ok,
      ).toBe(false);
      expect(mocks.admin).not.toHaveBeenCalled();
    });
    it("rejects a cart beyond 50 lines", async () => {
      expect(
        (
          await action(
            form(
              Array.from({ length: 51 }, () => ({ productId, quantity: 1 })),
            ),
          )
        ).ok,
      ).toBe(false);
      expect(mocks.products).not.toHaveBeenCalled();
    });
    it("rejects inactive products", async () => {
      mocks.products.mockResolvedValue([]);
      expect((await action(form())).ok).toBe(false);
      expect(mocks.admin).not.toHaveBeenCalled();
    });
  },
);
it("passes only product IDs, quantities and options to the atomic checkout RPC", async () => {
  const result = await createCheckoutOrdersAction(
    form([
      {
        productId,
        quantity: 2,
        priceAmount: 0,
        unitPrice: 0,
        storeId: "forged-store",
      },
    ]),
  );
  expect(result.ok).toBe(true);
  const [name, args] = mocks.rpc.mock.calls[0];
  expect(name).toBe("create_atomic_checkout_orders");
  expect(args.p_request_id).toBe(requestId);
  expect(args.p_user_id).toBe("buyer-1");
  expect(args.p_items[0].quantity).toBe(2);
  expect(args.p_items[0]).not.toHaveProperty("priceAmount");
  expect(args.p_items[0]).not.toHaveProperty("unitPrice");
  expect(args.p_items[0]).not.toHaveProperty("storeId");
});
it("rejects WhatsApp requests above available stock before writes", async () => {
  mocks.products.mockResolvedValue([{ ...product, stockQuantity: 0 }]);
  expect((await createWhatsAppOrderIntentAction(form())).ok).toBe(false);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("propagates an atomic checkout stock failure without scheduling messages", async () => {
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { message: "INSUFFICIENT_STOCK" },
  });
  expect((await createCheckoutOrdersAction(form())).ok).toBe(false);
  expect(mocks.after).not.toHaveBeenCalled();
});
it("rejects an oversized WhatsApp note before writes", async () => {
  expect(
    (
      await createWhatsAppOrderIntentAction(
        form(undefined, { note: "a".repeat(1001) }),
      )
    ).ok,
  ).toBe(false);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("rate-limits a guest WhatsApp order intent before creating orders", async () => {
  mocks.profile.mockResolvedValue(null);
  mocks.limit.mockResolvedValue({ ok: false, message: "limited" });
  const result = await createWhatsAppOrderIntentAction(form());
  expect(result.ok).toBe(false);
  expect(mocks.limit).toHaveBeenCalled();
  expect(mocks.admin).not.toHaveBeenCalled();
});
it.each([createCheckoutOrdersAction, createWhatsAppOrderIntentAction])(
  "fails closed when guest rate-limit persistence blocks %s",
  async (action) => {
    mocks.profile.mockResolvedValue(null);
    mocks.record.mockResolvedValue({ isBlocked: true, message: "unavailable" });
    const result = await action(form());
    expect(result.ok).toBe(false);
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  },
);

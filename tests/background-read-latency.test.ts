vi.mock("@/lib/security/api",()=>({apiRateLimit:async()=>null}));
import { beforeEach, expect, it, vi } from "vitest";
import { query } from "./query";

const mocks = vi.hoisted(() => ({
  server: vi.fn(), admin: vi.fn(), getUser: vi.fn(), from: vi.fn(),
  rate: vi.fn(),
  afterTasks: [] as Array<() => Promise<void>>,
}));
vi.mock("next/server", async (original) => ({ ...await original<typeof import("next/server")>(), after: (task: () => Promise<void>) => mocks.afterTasks.push(task) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.admin }));
vi.mock("@/lib/auth/security", () => ({getClientIp: async () => "203.0.113.1"}));
vi.mock("@/lib/security/rate-limit", () => ({consumeRateLimit: mocks.rate}));
import { GET } from "@/app/api/notifications/route";
import { trackProductViewAction, trackStoreViewAction } from "@/lib/analytics/actions";

beforeEach(() => {
  mocks.afterTasks = [];
  mocks.rate.mockResolvedValue({ok:true});
  mocks.getUser.mockResolvedValue({ data: { user: { id: "buyer-1" } } });
  mocks.server.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: mocks.from });
  mocks.admin.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue(query({ data: [] }));
});
it("serves only the verified user's notifications with private, non-stored responses", async () => {
  const read = query({ data: [{ id: "notice-1", title: "Order", type: "order", created_at: "2026-10-27" }] });
  mocks.from.mockReturnValue(read);
  const response = await GET();
  expect((await response.json()).notifications).toHaveLength(1);
  expect(read.eq).toHaveBeenCalledWith("user_id", "buyer-1");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("vary")).toBe("Cookie");
});
it("does not read any notifications for a guest", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await (await GET()).json()).notifications).toEqual([]);
  expect(mocks.from).not.toHaveBeenCalled();
});
it("does not expose database diagnostics in notification responses", async () => {
  mocks.from.mockReturnValue(query({ error: { message: "private storage diagnostic" } }));
  const data = await (await GET()).json();
  expect(data.ok).toBe(false);
  expect(JSON.stringify(data)).not.toContain("private storage diagnostic");
});
it.each([
  [trackProductViewAction, { productId: "11111111-1111-4111-8111-111111111111", visitorId: "visitor-1" }],
  [trackStoreViewAction, { storeId: "22222222-2222-4222-8222-222222222222", visitorId: "visitor-1" }],
])("does not make the next user action wait for view authentication or database writes", async (action, input) => {
  await (action as (input: unknown) => Promise<void>)(input);
  expect(mocks.server).not.toHaveBeenCalled();
  expect(mocks.admin).not.toHaveBeenCalled();
  expect(mocks.afterTasks).toHaveLength(1);
  mocks.from.mockReturnValue(query({ data: { id: "resource-1", owner_id: "seller-1" } }));
  await mocks.afterTasks[0]();
  expect(mocks.getUser).toHaveBeenCalled();
});
it("still excludes the seller's own view from analytics", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "seller-1" } } });
  const read = query({ data: { id: "11111111-1111-4111-8111-111111111111", owner_id: "seller-1" } });
  mocks.from.mockReturnValue(read);
  await trackProductViewAction({ productId: "11111111-1111-4111-8111-111111111111", visitorId: "visitor-1" });
  await mocks.afterTasks[0]();
  expect(read.insert).not.toHaveBeenCalled();
});
it("rejects malformed view inputs before scheduling work", async () => {
  await trackProductViewAction({ productId: "11111111-1111-4111-8111-111111111111", visitorId: 123 } as never);
  await trackStoreViewAction(null as never);
  expect(mocks.afterTasks).toHaveLength(0);
});

it("does not write views when the distributed budget denies the background task", async () => {
  mocks.rate.mockResolvedValue({ok:false});
  await trackProductViewAction({productId:"11111111-1111-4111-8111-111111111111", visitorId:"visitor-1"});
  expect(mocks.rate).not.toHaveBeenCalled();
  await mocks.afterTasks[0]();
  expect(mocks.server).not.toHaveBeenCalled();
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("rejects unbounded visitor IDs and injected resource IDs without scheduling writes", async () => {
  await trackProductViewAction({productId:"11111111-1111-4111-8111-111111111111", visitorId:"v".repeat(81)});
  await trackStoreViewAction({storeId:"id,owner_id.not.is.null", visitorId:"visitor-1"});
  expect(mocks.afterTasks).toHaveLength(0);
});

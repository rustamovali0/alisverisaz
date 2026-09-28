import { expect, it, vi } from "vitest";
import { getProductApprovalSettings } from "@/lib/products/approval-settings";
import { query } from "./query";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ from: mocks.from }) }));
it("requires review when approval settings cannot be read", async () => {
  mocks.from.mockReturnValue(query({ error: { code: "57014" } }));
  expect(await getProductApprovalSettings()).toEqual({ requireApproval: true });
});
it("honors a successfully loaded no-review policy", async () => {
  mocks.from.mockReturnValue(query({ data: { value: { require_approval: false } } }));
  expect(await getProductApprovalSettings()).toEqual({ requireApproval: false });
});

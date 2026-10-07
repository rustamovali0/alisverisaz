import { expect, it, vi } from "vitest";
import { getAuthProfile } from "@/lib/auth/profile-query";

function client(results: unknown[]) {
  const maybeSingle = vi.fn();
  results.forEach((result) => maybeSingle.mockResolvedValueOnce(result));
  const builder = { eq: vi.fn().mockReturnThis(), returns: vi.fn().mockReturnThis(), maybeSingle };
  const select = vi.fn().mockReturnValue(builder);
  return { supabase: { from: () => ({ select }) } as unknown as Parameters<typeof getAuthProfile>[0], select };
}

it("selects explicit profile columns including session revocation", async () => {
  const { supabase, select } = client([{ data: { role: "seller" }, error: null }]);
  await getAuthProfile(supabase, "seller");
  expect(select).toHaveBeenCalledTimes(1);
  expect(select.mock.calls[0][0]).toContain("session_revoked_at");
  expect(select.mock.calls[0][0]).not.toContain("*");
});

it("supports the older schema only when the optional revocation column is missing", async () => {
  const { supabase, select } = client([
    { data: null, error: { code: "42703", message: "column session_revoked_at does not exist" } },
    { data: { role: "seller" }, error: null },
  ]);
  expect((await getAuthProfile(supabase, "seller")).data).toEqual({ role: "seller" });
  expect(select).toHaveBeenCalledTimes(2);
  expect(select.mock.calls[1][0]).not.toContain("session_revoked_at");
});

it("does not hide permission or other database failures", async () => {
  const error = { code: "42501", message: "permission denied" };
  const { supabase, select } = client([{ data: null, error }]);
  expect((await getAuthProfile(supabase, "seller")).error).toEqual(error);
  expect(select).toHaveBeenCalledTimes(1);
});

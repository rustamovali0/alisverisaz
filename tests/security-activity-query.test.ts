import { expect, it, vi } from "vitest";
import { getAdminUserActivityLog } from "@/lib/activity/data";
import { literalContains } from "@/lib/security/postgrest";
const m = vi.hoisted(() => ({ or: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => {
      const builder: any = {
        data: [],
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        in: () => builder,
        eq: () => builder,
        or: (value: string) => {
          m.or(value);
          return builder;
        },
      };
      return builder;
    },
  }),
}));
it.each(["Əli Əliyev", "x),or(role.eq.admin)", "50%_", '\"slash\\'])(
  "uses one quoted literal per field for admin activity search: %s",
  async (term) => {
    const result = await getAdminUserActivityLog({ query: term });
    const value = literalContains(term);
    expect(m.or).toHaveBeenCalledWith(
      `email.ilike.${value},full_name.ilike.${value},phone.ilike.${value}`,
    );
    expect(result.users).toEqual([]);
  },
);

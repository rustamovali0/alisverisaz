"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { normalizeMarketplaceSearchTerm } from "@/lib/search/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PopularSearchActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function updatePopularSearchOverridesAction(
  formData: FormData,
): Promise<PopularSearchActionResult> {
  await requireRole(["admin"], "/radmin/searches");

  const overrides = ["search1", "search2", "search3", "search4"]
    .map((key) => normalizeMarketplaceSearchTerm(formData.get(key)))
    .filter((term, index, terms) =>
      term.length >= 2 &&
      terms.findIndex((candidate) => candidate.toLocaleLowerCase("az-AZ") === term.toLocaleLowerCase("az-AZ")) === index,
    );

  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();
  const currentValue =
    data?.value && typeof data.value === "object" && !Array.isArray(data.value)
      ? data.value
      : {};

  const { error } = await (supabase as any).from("platform_settings").upsert({
    key: "site",
    value: {
      ...currentValue,
      popular_search_overrides: overrides,
    },
  });

  if (error) {
    return { ok: false, message: "Populyar axtarışlar saxlanmadı." };
  }

  revalidatePath("/radmin/searches");
  return {
    ok: true,
    message: overrides.length
      ? "Manuel populyar axtarışlar yeniləndi."
      : "Manuel seçim silindi; avtomatik reytinq göstəriləcək.",
  };
}

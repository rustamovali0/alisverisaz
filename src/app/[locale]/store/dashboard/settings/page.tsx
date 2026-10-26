import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { PasswordChangeForm } from "@/components/dashboard/password-change-form";
import { StoreSettingsForm } from "@/components/dashboard/store-settings-form";
import { AccountLanguageSettings } from "@/components/i18n/account-language-settings";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryOptions } from "@/lib/products/data";

export const dynamic = "force-dynamic";

export default async function StoreSettingsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/settings");
  const enabled = await getSellerFeatureAccess(current.user.id, "settings");

  if (!enabled) {
    return <FeatureBlocked title="Ayarlar" />;
  }

  const supabase = await createSupabaseServerClient();
  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id,name,slug,logo_url,cover_url,settings")
    .eq("owner_id", current.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!store) {
    return <FeatureBlocked title="Mağaza tapılmadı" description="Mağaza yaradıldıqda ayarlar burada görünəcək." />;
  }

  const [{ data: productCategories }, categories] = await Promise.all([
    (supabase as any)
      .from("products")
      .select("category_id")
      .eq("store_id", store.id)
      .eq("status", "active")
      .not("category_id", "is", null),
    getCategoryOptions(),
  ]);
  const categoryIds = new Set(
    ((productCategories ?? []) as Array<{ category_id: string | null }>)
      .map((item) => item.category_id)
      .filter((id): id is string => Boolean(id)),
  );
  const availableCategories = categories
    .filter((category) => categoryIds.has(category.id))
    .map(({ id, name }) => ({ id, name }));

  return (
    <div className="grid gap-5">
      <AccountLanguageSettings />
      <StoreSettingsForm store={store} availableCategories={availableCategories} />
      <PasswordChangeForm />
    </div>
  );
}

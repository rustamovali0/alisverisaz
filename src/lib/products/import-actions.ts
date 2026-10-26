"use server";
import { requireRole } from "@/lib/auth/session";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseProductImport } from "./import-parser";
import { invalidateProductPublicData } from "@/lib/cache/public-cache";
import { revalidatePath } from "next/cache";

export async function productImportAction(form: FormData) {
  const current = await requireRole(["seller"], "/store/dashboard/products/import");
  const stores = await getOwnedStores(current.user.id);
  const store = stores.find((s) => s.id === form.get("storeId") && s.status === "active");
  if (!store || !await getSellerFeatureAccess(current.user.id, "products")) return { ok: false as const, message: "Mağaza üçün import icazəsi yoxdur." };
  try {
    const file = form.get("file");
    if (!(file instanceof File)) return { ok: false as const, message: "Fayl seçin." };
    const preview = await parseProductImport(file);
    if (form.get("confirm") !== "yes" || preview.errors.length) return { ok: true as const, preview };
    const mode = form.get("mode");
    const requestId = form.get("requestId");
    if (!['create', 'update'].includes(String(mode)) || typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false as const, message: "Import sorğusu düzgün deyil." };
    const db = await createSupabaseServerClient();
    const { data, error } = await (db as any).rpc("import_store_products", {
      store_uuid: store.id, request_uuid: requestId, import_mode: mode, rows_json: preview.rows,
    });
    if (error) {
      console.error("Product import rejected", { code: error.code });
      return { ok: false as const, message: "Import tamamlanmadı. Məhsul limitini, SKU və maya dəyərlərini yoxlayın. Heç bir sətir yadda saxlanmadı." };
    }
    invalidateProductPublicData({ storeId: store.id, storeSlug: store.slug, homepage: true });
    revalidatePath("/store/dashboard/products");
    return { ok: true as const, result: data as { added: number; updated: number; skipped: number; errors: number } };
  } catch {
    return { ok: false as const, message: "Fayl oxunmadı. Şablona uyğun, ən çox 2 MB və 200 sətirlik CSV/XLSX seçin." };
  }
}

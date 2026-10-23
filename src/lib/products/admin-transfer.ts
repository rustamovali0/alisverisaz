"use server";

import { revalidatePath } from "next/cache";

import { recordAdminAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { invalidateProductPublicData } from "@/lib/cache/public-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProductTransferStore = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type ProductTransferProduct = {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  status: string;
  imageUrl: string | null;
};

export type ProductTransferData = {
  stores: ProductTransferStore[];
  products: ProductTransferProduct[];
};

type TransferResult = {
  ok: boolean;
  message: string;
  movedCount?: number;
};

type ProductRow = {
  id: string;
  store_id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  status: string;
  category_id: string | null;
  listing_type: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PRODUCTS_PER_TRANSFER = 100;

function isMissingOptionalRelation(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  const message = String(value?.message ?? "").toLowerCase();
  return value?.code === "42P01" || value?.code === "PGRST205" || message.includes("schema cache");
}

function makeAvailableSlug(baseSlug: string, occupied: Set<string>, productId: string) {
  const normalized = baseSlug.trim() || `mehsul-${productId.slice(0, 8)}`;
  if (!occupied.has(normalized)) {
    occupied.add(normalized);
    return normalized;
  }

  const suffix = productId.replaceAll("-", "").slice(0, 8);
  let candidate = `${normalized}-${suffix}`;
  let counter = 2;
  while (occupied.has(candidate)) {
    candidate = `${normalized}-${suffix}-${counter}`;
    counter += 1;
  }
  occupied.add(candidate);
  return candidate;
}

export async function getProductTransferData(): Promise<ProductTransferData> {
  await requireRole(["admin"], "/radmin/product-transfer");
  const supabase = createSupabaseAdminClient();
  const [storesResult, productsResult] = await Promise.all([
    (supabase as any)
      .from("stores")
      .select("id,name,slug,status")
      .order("name", { ascending: true }),
    (supabase as any)
      .from("products")
      .select("id,store_id,name,slug,status,listing_type,product_images(url,is_primary,sort_order)")
      .eq("listing_type", "store")
      .order("name", { ascending: true }),
  ]);

  if (storesResult.error) {
    throw new Error(storesResult.error.message);
  }
  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  return {
    stores: (storesResult.data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
    })),
    products: (productsResult.data ?? []).map((row: any) => {
      const images = [...(row.product_images ?? [])].sort((left: any, right: any) => {
        if (Boolean(left.is_primary) !== Boolean(right.is_primary)) return left.is_primary ? -1 : 1;
        return Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
      });
      return {
        id: row.id,
        storeId: row.store_id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        imageUrl: images[0]?.url ?? null,
      };
    }),
  };
}

export async function transferProductsByAdminAction(formData: FormData): Promise<TransferResult> {
  const current = await requireRole(["admin"], "/radmin/product-transfer");
  const sourceStoreId = String(formData.get("sourceStoreId") ?? "").trim();
  const targetStoreId = String(formData.get("targetStoreId") ?? "").trim();
  const productIds = [...new Set(
    formData.getAll("productId").map((value) => String(value).trim()).filter(Boolean),
  )];

  if (!UUID_PATTERN.test(sourceStoreId) || !UUID_PATTERN.test(targetStoreId)) {
    return { ok: false, message: "Mənbə və hədəf mağazanı düzgün seçin." };
  }
  if (sourceStoreId === targetStoreId) {
    return { ok: false, message: "Mənbə və hədəf mağaza eyni ola bilməz." };
  }
  if (productIds.length === 0) {
    return { ok: false, message: "Köçürmək üçün ən azı bir məhsul seçin." };
  }
  if (productIds.length > MAX_PRODUCTS_PER_TRANSFER || productIds.some((id) => !UUID_PATTERN.test(id))) {
    return { ok: false, message: `Bir əməliyyatda ən çox ${MAX_PRODUCTS_PER_TRANSFER} düzgün məhsul seçilə bilər.` };
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: sourceStore }, { data: targetStore }] = await Promise.all([
    (supabase as any).from("stores").select("id,name,slug,owner_id").eq("id", sourceStoreId).maybeSingle(),
    (supabase as any).from("stores").select("id,name,slug,owner_id").eq("id", targetStoreId).maybeSingle(),
  ]);

  if (!sourceStore || !targetStore) {
    return { ok: false, message: "Seçilmiş mağazalardan biri tapılmadı." };
  }

  const { data: selectedRows, error: productsError } = await (supabase as any)
    .from("products")
    .select("id,store_id,owner_id,name,slug,status,category_id,listing_type")
    .eq("store_id", sourceStoreId)
    .eq("listing_type", "store")
    .in("id", productIds);

  if (productsError) {
    return { ok: false, message: productsError.message };
  }

  const products = (selectedRows ?? []) as ProductRow[];
  if (products.length !== productIds.length) {
    return { ok: false, message: "Məhsullardan biri mənbə mağazaya aid deyil və ya artıq köçürülüb." };
  }

  const { data: targetProducts, error: targetProductsError } = await (supabase as any)
    .from("products")
    .select("slug")
    .eq("store_id", targetStoreId);
  if (targetProductsError) {
    return { ok: false, message: targetProductsError.message };
  }

  const occupiedSlugs = new Set<string>((targetProducts ?? []).map((row: any) => row.slug));
  const planned = products.map((product) => ({
    product,
    nextSlug: makeAvailableSlug(product.slug, occupiedSlugs, product.id),
  }));
  const moved: typeof planned = [];

  for (const item of planned) {
    const { error } = await (supabase as any)
      .from("products")
      .update({
        store_id: targetStoreId,
        owner_id: targetStore.owner_id,
        slug: item.nextSlug,
      })
      .eq("id", item.product.id)
      .eq("store_id", sourceStoreId);

    if (error) {
      for (const rollback of moved) {
        await (supabase as any).from("products").update({
          store_id: sourceStoreId,
          owner_id: rollback.product.owner_id,
          slug: rollback.product.slug,
        }).eq("id", rollback.product.id);
      }
      await recordAdminAudit({
        action: "transfer_products",
        adminId: current.user.id,
        entityType: "products",
        success: false,
        metadata: { sourceStoreId, targetStoreId, productIds, error: error.message },
      });
      return { ok: false, message: `Köçürmə dayandırıldı: ${error.message}` };
    }
    moved.push(item);
  }

  const dependentOperations = [
    (supabase as any).from("product_locations").delete().in("product_id", productIds),
    (supabase as any).from("product_views").update({ seller_id: targetStore.owner_id }).in("product_id", productIds),
    (supabase as any).from("product_statistics").update({ seller_id: targetStore.owner_id }).in("product_id", productIds),
    (supabase as any).from("promotion_requests").update({
      store_id: targetStoreId,
      requester_id: targetStore.owner_id,
    }).in("product_id", productIds),
  ];
  const dependentResults = await Promise.all(dependentOperations);
  const dependencyErrors = dependentResults
    .map((result: any) => result.error)
    .filter((error: unknown) => error && !isMissingOptionalRelation(error))
    .map((error: any) => error.message);

  for (const item of planned) {
    invalidateProductPublicData({
      productId: item.product.id,
      storeId: sourceStoreId,
      storeSlug: sourceStore.slug,
      categoryId: item.product.category_id,
      homepage: true,
    });
    invalidateProductPublicData({
      productId: item.product.id,
      storeId: targetStoreId,
      storeSlug: targetStore.slug,
      categoryId: item.product.category_id,
      homepage: true,
    });
  }

  revalidatePath("/radmin/product-transfer");
  revalidatePath("/radmin/products");
  revalidatePath("/radmin/stores");
  revalidatePath("/store/dashboard/products");
  revalidatePath(`/store/${sourceStore.slug}`);
  revalidatePath(`/store/${targetStore.slug}`);

  await recordAdminAudit({
    action: "transfer_products",
    adminId: current.user.id,
    entityType: "products",
    success: dependencyErrors.length === 0,
    metadata: {
      sourceStoreId,
      sourceStoreName: sourceStore.name,
      targetStoreId,
      targetStoreName: targetStore.name,
      productIds,
      productNames: products.map((product) => product.name),
      dependencyErrors,
    },
  });

  return {
    ok: true,
    movedCount: products.length,
    message: `${products.length} məhsul “${sourceStore.name}” mağazasından “${targetStore.name}” mağazasına köçürüldü.`,
  };
}

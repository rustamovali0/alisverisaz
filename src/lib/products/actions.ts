"use server";

import { revalidatePath } from "next/cache";

import { ensureAuthProfile } from "@/lib/auth/profiles";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { canCreateListing } from "@/lib/subscriptions/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ProductActionResult,
  ProductStatus,
  ProductVariantInput,
} from "@/lib/products/types";

const PRODUCT_IMAGE_BUCKET = "product-images";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));

  return Number.isFinite(value) ? value : 0;
}

function readStatus(value: string): ProductStatus {
  if (value === "active" || value === "archived") {
    return value;
  }

  return "draft";
}

function readDepositType(value: string) {
  return value === "percent" ? "percent" : "fixed";
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "mehsul"}-${crypto.randomUUID().slice(0, 8)}`;
}

function parseVariants(value: string): ProductVariantInput[] {
  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "Variant", variantValue = line, price = "0", stock = "0"] =
        line.split("|").map((part) => part.trim());

      return {
        name,
        value: variantValue,
        priceDeltaAmount: Number(price) || 0,
        stockQuantity: Math.max(Math.trunc(Number(stock) || 0), 0),
      };
    });
}

function getImageFiles(formData: FormData) {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function uploadProductImages(input: {
  userId: string;
  productId: string;
  productName: string;
  files: File[];
}) {
  if (input.files.length === 0) {
    return;
  }

  const supabaseAdmin = createSupabaseAdminClient();

  await Promise.all(
    input.files.map(async (file, index) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `${input.userId}/${input.productId}/${crypto.randomUUID()}.${extension}`;
      const body = new Uint8Array(await file.arrayBuffer());
      const { error: uploadError } = await supabaseAdmin.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(storagePath, body, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabaseAdmin.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(storagePath);

      const { error: imageError } = await (supabaseAdmin as any)
        .from("product_images")
        .insert({
          product_id: input.productId,
          url: data.publicUrl,
          alt_text: input.productName,
          sort_order: index,
          is_primary: index === 0,
        });

      if (imageError) {
        throw new Error(imageError.message);
      }
    }),
  );
}

async function replaceVariants(productId: string, variants: ProductVariantInput[]) {
  const supabaseAdmin = createSupabaseAdminClient();

  await (supabaseAdmin as any)
    .from("product_variants")
    .delete()
    .eq("product_id", productId);

  if (variants.length === 0) {
    return;
  }

  const { error } = await (supabaseAdmin as any).from("product_variants").insert(
    variants.map((variant) => ({
      product_id: productId,
      name: variant.name,
      value: variant.value,
      price_delta_amount: variant.priceDeltaAmount,
      stock_quantity: variant.stockQuantity,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }
}

function readProductPayload(formData: FormData) {
  const name = readString(formData, "name");
  const nameTranslations = {
    en: readString(formData, "name_en"),
    ru: readString(formData, "name_ru"),
  };
  const categoryId = readString(formData, "categoryId");
  const priceAmount = readNumber(formData, "priceAmount");
  const discountAmount = readNumber(formData, "discountAmount");
  const stockQuantity = Math.max(Math.trunc(readNumber(formData, "stockQuantity")), 0);
  const description = readString(formData, "description");
  const descriptionTranslations = {
    en: readString(formData, "description_en"),
    ru: readString(formData, "description_ru"),
  };
  const seoTitleTranslations = {
    az: readString(formData, "seo_title_az"),
    en: readString(formData, "seo_title_en"),
    ru: readString(formData, "seo_title_ru"),
  };
  const seoDescriptionTranslations = {
    az: readString(formData, "seo_description_az"),
    en: readString(formData, "seo_description_en"),
    ru: readString(formData, "seo_description_ru"),
  };
  const status = readStatus(readString(formData, "status"));
  const variants = parseVariants(readString(formData, "variants"));
  const depositEnabled = readString(formData, "depositEnabled") === "on";
  const depositType = readDepositType(readString(formData, "depositType"));
  const depositValue = readNumber(formData, "depositValue");

  return {
    name,
    nameTranslations,
    categoryId: categoryId || null,
    priceAmount,
    discountAmount,
    stockQuantity,
    description,
    descriptionTranslations,
    seoTitleTranslations,
    seoDescriptionTranslations,
    status,
    variants,
    depositEnabled,
    depositType,
    depositValue,
  };
}

function validatePayload(payload: ReturnType<typeof readProductPayload>) {
  if (!payload.name) {
    return "Ad mütləqdir.";
  }

  if (payload.priceAmount < 0 || payload.discountAmount < 0) {
    return "Qiymət və endirim mənfi ola bilməz.";
  }

  if (payload.depositValue < 0) {
    return "Beh məbləği mənfi ola bilməz.";
  }

  return null;
}

export async function createStoreProductAction(
  formData: FormData,
): Promise<ProductActionResult> {
  const current = await requireRole(["seller"], "/store/dashboard/products");
  const featureEnabled = await getSellerFeatureAccess(current.user.id, "products");

  if (!featureEnabled) {
    return {
      ok: false,
      message: "Məhsul idarəetməsi admin tərəfindən deaktiv edilib.",
    };
  }

  const storeId = readString(formData, "storeId");
  const payload = readProductPayload(formData);
  const validationError = validatePayload(payload);

  if (validationError) {
    return {
      ok: false,
      message: validationError,
    };
  }

  const stores = await getOwnedStores(current.user.id);
  const ownsStore = stores.some((store) => store.id === storeId);

  if (!ownsStore) {
    return {
      ok: false,
      message: "Bu mağaza üzərində icazəniz yoxdur.",
    };
  }

  const limit = await canCreateListing(storeId);

  if (!limit.allowed) {
    return {
      ok: false,
      message: "Aktiv plan yoxdur və ya elan limiti bitib.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: product, error } = await (supabase as any)
    .from("products")
    .insert({
      store_id: storeId,
      owner_id: current.user.id,
      category_id: payload.categoryId,
      name: payload.name,
      name_translations: payload.nameTranslations,
      slug: slugify(payload.name),
      description: payload.description,
      description_translations: payload.descriptionTranslations,
      seo_title_translations: payload.seoTitleTranslations,
      seo_description_translations: payload.seoDescriptionTranslations,
      price_amount: payload.priceAmount,
      discount_amount: payload.discountAmount,
      stock_quantity: payload.stockQuantity,
      status: payload.status,
      listing_type: "store",
      deposit_enabled: payload.depositEnabled,
      deposit_type: payload.depositType,
      deposit_value: payload.depositValue,
      metadata: {
        variants: payload.variants,
      },
    })
    .select("id")
    .single();

  if (error || !product) {
    return {
      ok: false,
      message: error?.message ?? "Məhsul yaradıla bilmədi.",
    };
  }

  try {
    await replaceVariants(product.id, payload.variants);
    await uploadProductImages({
      userId: current.user.id,
      productId: product.id,
      productName: payload.name,
      files: getImageFiles(formData),
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Şəkil yüklənmədi.",
    };
  }

  revalidatePath("/store/dashboard/products");

  return {
    ok: true,
    message: "Məhsul yaradıldı.",
  };
}

export async function updateProductAction(
  formData: FormData,
): Promise<ProductActionResult> {
  const current = await requireRole(
    ["seller", "customer", "admin"],
    "/dashboard/listings",
  );
  if (current.role === "seller") {
    const featureEnabled = await getSellerFeatureAccess(current.user.id, "products");

    if (!featureEnabled) {
      return {
        ok: false,
        message: "Məhsul idarəetməsi admin tərəfindən deaktiv edilib.",
      };
    }
  }

  const productId = readString(formData, "productId");
  const payload = readProductPayload(formData);
  const validationError = validatePayload(payload);

  if (!productId) {
    return {
      ok: false,
      message: "Məhsul ID tapılmadı.",
    };
  }

  if (validationError) {
    return {
      ok: false,
      message: validationError,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await (supabase as any)
    .from("products")
    .select("id,listing_type,metadata")
    .eq("id", productId)
    .maybeSingle();

  if (!existing) {
    return {
      ok: false,
      message: "Məhsul tapılmadı.",
    };
  }

  const status =
    existing.listing_type === "personal" &&
    payload.status === "active" &&
    existing.metadata?.payment_status !== "paid"
      ? "draft"
      : payload.status;
  const metadata =
    existing.listing_type === "personal"
      ? {
          ...(existing.metadata ?? {}),
          variants: payload.variants,
        }
      : {
          variants: payload.variants,
        };

  const { error } = await (supabase as any)
    .from("products")
    .update({
      category_id: payload.categoryId,
      name: payload.name,
      name_translations: payload.nameTranslations,
      description: payload.description,
      description_translations: payload.descriptionTranslations,
      seo_title_translations: payload.seoTitleTranslations,
      seo_description_translations: payload.seoDescriptionTranslations,
      price_amount: payload.priceAmount,
      discount_amount: payload.discountAmount,
      stock_quantity: payload.stockQuantity,
      status,
      deposit_enabled: payload.depositEnabled,
      deposit_type: payload.depositType,
      deposit_value: payload.depositValue,
      metadata,
    })
    .eq("id", productId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  try {
    await replaceVariants(productId, payload.variants);
    await uploadProductImages({
      userId: current.user.id,
      productId,
      productName: payload.name,
      files: getImageFiles(formData),
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Şəkil yüklənmədi.",
    };
  }

  revalidatePath("/store/dashboard/products");
  revalidatePath("/dashboard/listings");
  revalidatePath("/admin/products");
  revalidatePath("/admin/stores");

  return {
    ok: true,
    message: "Məhsul yeniləndi.",
  };
}

export async function deleteProductAction(
  formData: FormData,
): Promise<ProductActionResult> {
  const current = await requireRole(
    ["seller", "customer", "admin"],
    "/dashboard/listings",
  );
  if (current.role === "seller") {
    const featureEnabled = await getSellerFeatureAccess(current.user.id, "products");

    if (!featureEnabled) {
      return {
        ok: false,
        message: "Məhsul idarəetməsi admin tərəfindən deaktiv edilib.",
      };
    }
  }

  const productId = readString(formData, "productId");

  if (!productId) {
    return {
      ok: false,
      message: "Məhsul ID tapılmadı.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await (supabase as any)
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/store/dashboard/products");
  revalidatePath("/dashboard/listings");
  revalidatePath("/admin/products");
  revalidatePath("/admin/stores");

  return {
    ok: true,
    message: "Məhsul silindi.",
  };
}

async function ensurePersonalStore(input: {
  userId: string;
  email: string | null;
  fullName: string | null;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const slug = `personal-${input.userId}`;
  const { data: existing } = await (supabaseAdmin as any)
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return existing.id as string;
  }

  const { data: store, error } = await (supabaseAdmin as any)
    .from("stores")
    .insert({
      owner_id: input.userId,
      name: input.fullName ? `${input.fullName} elanları` : "Fərdi elanlar",
      slug,
      status: "active",
      settings: {
        kind: "personal_listings",
      },
    })
    .select("id")
    .single();

  if (error || !store) {
    throw new Error(error?.message ?? "Fərdi elan mağazası yaradıla bilmədi.");
  }

  return store.id as string;
}

async function ensureCustomer(input: {
  userId: string;
  storeId: string;
  email: string | null;
  fullName: string | null;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existing } = await (supabaseAdmin as any)
    .from("customers")
    .select("id")
    .eq("store_id", input.storeId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existing) {
    return existing.id as string;
  }

  const { data: customer, error } = await (supabaseAdmin as any)
    .from("customers")
    .insert({
      store_id: input.storeId,
      user_id: input.userId,
      email: input.email,
      full_name: input.fullName,
    })
    .select("id")
    .single();

  if (error || !customer) {
    throw new Error(error?.message ?? "Müştəri qeydi yaradıla bilmədi.");
  }

  return customer.id as string;
}

export async function createPersonalListingAction(
  formData: FormData,
): Promise<ProductActionResult> {
  const current = await requireRole(["customer"], "/dashboard/listings");
  await ensureAuthProfile({
    id: current.user.id,
    email: current.user.email ?? null,
    fullName: current.profile?.full_name ?? null,
    role: current.role,
  });

  const payload = readProductPayload(formData);
  const validationError = validatePayload(payload);

  if (validationError) {
    return {
      ok: false,
      message: validationError,
    };
  }

  try {
    const storeId = await ensurePersonalStore({
      userId: current.user.id,
      email: current.user.email ?? null,
      fullName: current.profile?.full_name ?? null,
    });
    const customerId = await ensureCustomer({
      userId: current.user.id,
      storeId,
      email: current.user.email ?? null,
      fullName: current.profile?.full_name ?? null,
    });
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: payment, error: paymentError } = await (supabaseAdmin as any)
      .from("payments")
      .insert({
        store_id: storeId,
        customer_id: customerId,
        provider: "placeholder_personal_listing",
        amount: 1,
        currency: "AZN",
        status: "pending",
        metadata: {
          purpose: "personal_listing_activation",
        },
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      throw new Error(paymentError?.message ?? "Ödəniş qeydi yaradıla bilmədi.");
    }

    const { data: product, error: productError } = await (supabaseAdmin as any)
      .from("products")
      .insert({
        store_id: storeId,
        owner_id: current.user.id,
        category_id: payload.categoryId,
        name: payload.name,
        name_translations: payload.nameTranslations,
        slug: slugify(payload.name),
        description: payload.description,
        description_translations: payload.descriptionTranslations,
        seo_title_translations: payload.seoTitleTranslations,
        seo_description_translations: payload.seoDescriptionTranslations,
        price_amount: payload.priceAmount,
        discount_amount: payload.discountAmount,
        stock_quantity: payload.stockQuantity,
        status: "draft",
        listing_type: "personal",
        deposit_enabled: payload.depositEnabled,
        deposit_type: payload.depositType,
        deposit_value: payload.depositValue,
        activation_payment_id: payment.id,
        metadata: {
          payment_status: "pending",
          listing_fee_amount: 1,
          variants: payload.variants,
        },
      })
      .select("id")
      .single();

    if (productError || !product) {
      throw new Error(productError?.message ?? "Elan yaradıla bilmədi.");
    }

    await replaceVariants(product.id, payload.variants);
    await uploadProductImages({
      userId: current.user.id,
      productId: product.id,
      productName: payload.name,
      files: getImageFiles(formData),
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Elan yaradıla bilmədi.",
    };
  }

  revalidatePath("/dashboard/listings");

  return {
    ok: true,
    message: "Elan yaradıldı. Aktivləşdirmək üçün 1 AZN placeholder ödənişi təsdiqləyin.",
  };
}

export async function confirmPersonalListingPaymentAction(
  formData: FormData,
): Promise<ProductActionResult> {
  const current = await requireRole(["customer"], "/dashboard/listings");
  const productId = readString(formData, "productId");

  if (!productId) {
    return {
      ok: false,
      message: "Elan ID tapılmadı.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: product } = await (supabase as any)
    .from("products")
    .select("id,activation_payment_id,metadata")
    .eq("id", productId)
    .eq("owner_id", current.user.id)
    .eq("listing_type", "personal")
    .maybeSingle();

  if (!product?.activation_payment_id) {
    return {
      ok: false,
      message: "Bu elan üçün ödəniş qeydi tapılmadı.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error: paymentError } = await (supabaseAdmin as any)
    .from("payments")
    .update({
      status: "paid",
      paid_at: now,
      metadata: {
        purpose: "personal_listing_activation",
        payment_mode: "placeholder",
      },
    })
    .eq("id", product.activation_payment_id)
    .eq("amount", 1);

  if (paymentError) {
    return {
      ok: false,
      message: paymentError.message,
    };
  }

  const { error: productError } = await (supabaseAdmin as any)
    .from("products")
    .update({
      status: "active",
      metadata: {
        ...(product.metadata ?? {}),
        payment_status: "paid",
        paid_at: now,
      },
    })
    .eq("id", productId)
    .eq("owner_id", current.user.id);

  if (productError) {
    return {
      ok: false,
      message: productError.message,
    };
  }

  revalidatePath("/dashboard/listings");

  return {
    ok: true,
    message: "1 AZN placeholder ödəniş təsdiqləndi və elan aktivləşdi.",
  };
}

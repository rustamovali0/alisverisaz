"use server";

import { revalidatePath } from "next/cache";

import { ensureAuthProfile } from "@/lib/auth/profiles";
import { requireRole } from "@/lib/auth/session";
import { invalidateProductPublicData } from "@/lib/cache/public-cache";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { canCreateListing, getStoreEntitlements } from "@/lib/subscriptions/data";
import {
  deleteR2ImageByUrl,
  deleteR2ImagesByUrls,
  uploadImageToR2,
} from "@/lib/storage/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ProductActionResult,
  ProductOptionInput,
  ProductOptionType,
  ProductVariantCombinationInput,
  ProductStatus,
  ProductVariantInput,
} from "@/lib/products/types";
import {
  PRODUCT_OPTION_TYPES,
  getEnabledProductOptions,
  normalizeProductOptions,
} from "@/lib/products/variant-utils";

const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = ["image/*"];

function isMissingTableError(error: unknown) {
  const value = error as { code?: string; message?: string } | null | undefined;
  const message = String(value?.message ?? "");

  return value?.code === "PGRST205" || value?.code === "42P01" || message.includes("schema cache");
}

function revalidateMarketplaceSurfaces(input: {
  productId?: string | null;
  storeId?: string | null;
  categoryId?: string | null;
  storeSlug?: string | null;
  homepage?: boolean;
} = {}) {
  invalidateProductPublicData(input);
}

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

function isOptionType(value: unknown): value is ProductOptionType {
  return typeof value === "string" && PRODUCT_OPTION_TYPES.includes(value as ProductOptionType);
}

function readJsonObject(value: string) {
  if (!value || value.length > 50_000) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function parseVariantConfig(formData: FormData) {
  const parsed = readJsonObject(readString(formData, "variantConfig")) as {
    options?: unknown;
    combinations?: unknown;
  } | null;

  if (!parsed) {
    const legacyVariants = parseVariants(readString(formData, "variants"));

    return {
      options: [],
      combinations: [],
      legacyVariants,
    };
  }

  const options = Array.isArray(parsed.options)
    ? parsed.options
        .map((option, index): ProductOptionInput | null => {
          const row = option as {
            type?: unknown;
            name?: unknown;
            isEnabled?: unknown;
            values?: unknown;
          };

          if (!isOptionType(row.type)) {
            return null;
          }

          const name = typeof row.name === "string" ? row.name.trim().slice(0, 60) : "";
          const seenValues = new Set<string>();
          const values = Array.isArray(row.values)
            ? row.values
                .map((value, valueIndex) => {
                  const valueRow = value as {
                    value?: unknown;
                    colorHex?: unknown;
                  };
                  const text =
                    typeof valueRow.value === "string"
                      ? valueRow.value.trim().slice(0, 80)
                      : "";
                  const colorHex =
                    typeof valueRow.colorHex === "string" &&
                    /^#[0-9a-f]{6}$/i.test(valueRow.colorHex)
                      ? valueRow.colorHex
                      : null;
                  const duplicateKey = text.toLocaleLowerCase("az");

                  if (!text || seenValues.has(duplicateKey)) {
                    return null;
                  }

                  seenValues.add(duplicateKey);

                  return {
                    value: text,
                    colorHex,
                    sortOrder: valueIndex,
                  };
                })
                .filter((value): value is NonNullable<typeof value> => Boolean(value))
                .slice(0, 40)
            : [];

          return {
            type: row.type,
            name:
              name ||
              (row.type === "color"
                ? "Rəng"
                : row.type === "size"
                  ? "Ölçü"
                  : `Seçim ${index + 1}`),
            isEnabled: Boolean(row.isEnabled) && values.length > 0,
            sortOrder: index,
            values,
          };
        })
        .filter((option): option is ProductOptionInput => Boolean(option))
    : [];
  const normalizedOptions = normalizeProductOptions(options);
  const enabledOptions = getEnabledProductOptions(normalizedOptions);
  const allowedValues = new Map(
    enabledOptions.map((option) => [
      option.type,
      new Set(option.values.map((value) => value.value)),
    ]),
  );
  const combinations = Array.isArray(parsed.combinations)
    ? parsed.combinations
        .map((combination): ProductVariantCombinationInput | null => {
          const row = combination as {
            combination?: unknown;
            sku?: unknown;
            priceOverrideAmount?: unknown;
            stockQuantity?: unknown;
            isEnabled?: unknown;
          };
          const values =
            row.combination && typeof row.combination === "object"
              ? (row.combination as Record<string, unknown>)
              : {};
          const safeCombination = PRODUCT_OPTION_TYPES.reduce<Record<string, string>>(
            (next, type) => {
              const value =
                typeof values[type] === "string"
                  ? values[type].trim().slice(0, 80)
                  : "";

              if (value && allowedValues.get(type)?.has(value)) {
                next[type] = value;
              }

              return next;
            },
            {},
          );

          if (Object.keys(safeCombination).length !== enabledOptions.length) {
            return null;
          }

          const priceOverride =
            row.priceOverrideAmount === null ||
            row.priceOverrideAmount === undefined ||
            row.priceOverrideAmount === ""
              ? null
              : Math.max(Number(row.priceOverrideAmount) || 0, 0);

          return {
            combination: safeCombination,
            sku:
              typeof row.sku === "string" && row.sku.trim()
                ? row.sku.trim().slice(0, 80)
                : null,
            priceOverrideAmount: priceOverride,
            stockQuantity: Math.max(Math.trunc(Number(row.stockQuantity) || 0), 0),
            isEnabled: row.isEnabled !== false,
          };
        })
        .filter((combination): combination is ProductVariantCombinationInput =>
          Boolean(combination),
        )
        .slice(0, 200)
    : [];
  const legacyVariants = enabledOptions.flatMap((option) =>
    option.values.map((value) => ({
      name: option.name,
      value: value.value,
      priceDeltaAmount: 0,
      stockQuantity: 0,
    })),
  );

  return {
    options: normalizedOptions,
    combinations,
    legacyVariants,
  };
}

function getImageFiles(formData: FormData) {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function uploadProductImageFiles(input: {
  userId: string;
  productId: string;
  files: File[];
}) {
  return Promise.all(
    input.files.map((file) =>
      uploadImageToR2({
        file,
        folder: `products/${input.userId}/${input.productId}`,
        maxSizeBytes: MAX_PRODUCT_IMAGE_SIZE,
        allowedMimeTypes: ALLOWED_PRODUCT_IMAGE_TYPES,
      }),
    ),
  );
}

function assertImageLimit(input: {
  imagesPerProductLimit: number | null;
  nextImageCount: number;
}) {
  if (
    input.imagesPerProductLimit !== null &&
    input.nextImageCount > input.imagesPerProductLimit
  ) {
    throw new Error("Məhsul şəkil limitiniz dolub.");
  }
}

async function assertStoreImageLimit(input: {
  storeId: string;
  nextImageCount: number;
}) {
  const entitlements = await getStoreEntitlements(input.storeId);

  assertImageLimit({
    imagesPerProductLimit: entitlements.imagesPerProductLimit,
    nextImageCount: input.nextImageCount,
  });
}

async function assertProductImageLimitBeforeUpload(input: {
  productId: string;
  newImageCount: number;
  replaceExisting: boolean;
}) {
  if (input.newImageCount === 0) {
    return;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: product } = await (supabaseAdmin as any)
    .from("products")
    .select("id,store_id,listing_type")
    .eq("id", input.productId)
    .maybeSingle();

  if (!product || product.listing_type !== "store") {
    return;
  }

  const entitlements = await getStoreEntitlements(product.store_id);

  if (input.replaceExisting) {
    assertImageLimit({
      imagesPerProductLimit: entitlements.imagesPerProductLimit,
      nextImageCount: input.newImageCount,
    });
    return;
  }

  const { count } = await (supabaseAdmin as any)
    .from("product_images")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("product_id", input.productId);

  assertImageLimit({
    imagesPerProductLimit: entitlements.imagesPerProductLimit,
    nextImageCount: (count ?? 0) + input.newImageCount,
  });
}

async function insertProductImageRows(input: {
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  productId: string;
  productName: string;
  existingImageCount: number;
  images: Awaited<ReturnType<typeof uploadProductImageFiles>>;
}) {
  await Promise.all(
    input.images.map((image, index) =>
      (input.supabaseAdmin as any).from("product_images").insert({
        product_id: input.productId,
        url: image.url,
        alt_text: input.productName,
        sort_order: input.existingImageCount + index,
        is_primary: input.existingImageCount === 0 && index === 0,
      }),
    ),
  ).then((results) => {
    const failed = results.find((result) => result.error);

    if (failed?.error) {
      throw new Error(failed.error.message);
    }
  });
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

  await assertProductImageLimitBeforeUpload({
    productId: input.productId,
    newImageCount: input.files.length,
    replaceExisting: false,
  });

  const uploadedImages = await uploadProductImageFiles(input);
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existingImages } = await (supabaseAdmin as any)
    .from("product_images")
    .select("id")
    .eq("product_id", input.productId);

  try {
    await insertProductImageRows({
      supabaseAdmin,
      productId: input.productId,
      productName: input.productName,
      existingImageCount: existingImages?.length ?? 0,
      images: uploadedImages,
    });
  } catch (error) {
    await deleteR2ImagesByUrls(uploadedImages.map((image) => image.url));
    throw error;
  }
}

async function replaceProductImages(input: {
  userId: string;
  productId: string;
  productName: string;
  files: File[];
}) {
  if (input.files.length === 0) {
    return [];
  }

  await assertProductImageLimitBeforeUpload({
    productId: input.productId,
    newImageCount: input.files.length,
    replaceExisting: true,
  });

  const uploadedImages = await uploadProductImageFiles(input);
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existingImages, error: lookupError } = await (supabaseAdmin as any)
    .from("product_images")
    .select("url")
    .eq("product_id", input.productId);

  if (lookupError) {
    await deleteR2ImagesByUrls(uploadedImages.map((image) => image.url));
    throw new Error(lookupError.message);
  }

  const { error: deleteError } = await (supabaseAdmin as any)
    .from("product_images")
    .delete()
    .eq("product_id", input.productId);

  if (deleteError) {
    await deleteR2ImagesByUrls(uploadedImages.map((image) => image.url));
    throw new Error(deleteError.message);
  }

  try {
    await insertProductImageRows({
      supabaseAdmin,
      productId: input.productId,
      productName: input.productName,
      existingImageCount: 0,
      images: uploadedImages,
    });
  } catch (error) {
    await deleteR2ImagesByUrls(uploadedImages.map((image) => image.url));
    throw error;
  }

  return ((existingImages ?? []) as Array<{ url: string | null }>).map(
    (image) => image.url,
  );
}

async function replaceVariants(input: {
  productId: string;
  options: ProductOptionInput[];
  combinations: ProductVariantCombinationInput[];
  legacyVariants: ProductVariantInput[];
}) {
  const supabaseAdmin = createSupabaseAdminClient();

  await (supabaseAdmin as any)
    .from("product_options")
    .delete()
    .eq("product_id", input.productId);

  await (supabaseAdmin as any)
    .from("product_variants")
    .delete()
    .eq("product_id", input.productId);

  const enabledOptions = getEnabledProductOptions(input.options);

  for (const option of input.options.filter((item) => item.isEnabled)) {
    const { data: optionRow, error: optionError } = await (supabaseAdmin as any)
      .from("product_options")
      .insert({
        product_id: input.productId,
        name: option.name,
        type: option.type,
        is_enabled: option.isEnabled,
        sort_order: option.sortOrder ?? 0,
      })
      .select("id")
      .single();

    if (optionError || !optionRow) {
      throw new Error(optionError?.message ?? "Variant seçimi saxlanmadı.");
    }

    if (option.values.length > 0) {
      const { error: valuesError } = await (supabaseAdmin as any)
        .from("product_option_values")
        .insert(
          option.values.map((value, index) => ({
            option_id: optionRow.id,
            value: value.value,
            color_hex: value.colorHex ?? null,
            sort_order: value.sortOrder ?? index,
          })),
        );

      if (valuesError) {
        throw new Error(valuesError.message);
      }
    }
  }

  if (input.combinations.length > 0) {
    const { error } = await (supabaseAdmin as any).from("product_variants").insert(
      input.combinations.map((variant) => ({
        product_id: input.productId,
        name: enabledOptions
          .map((option) => `${option.name}: ${variant.combination[option.type]}`)
          .join(" / "),
        value: Object.values(variant.combination).join(" / "),
        price_delta_amount: 0,
        stock_quantity: variant.stockQuantity,
        combination: variant.combination,
        sku: variant.sku ?? null,
        price_override_amount: variant.priceOverrideAmount ?? null,
        is_enabled: variant.isEnabled !== false,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  if (input.legacyVariants.length === 0) {
    return;
  }

  const { error } = await (supabaseAdmin as any).from("product_variants").insert(
    input.legacyVariants.map((variant) => ({
      product_id: input.productId,
      name: variant.name,
      value: variant.value,
      price_delta_amount: variant.priceDeltaAmount,
      stock_quantity: variant.stockQuantity,
      combination: variant.combination ?? {},
      sku: variant.sku ?? null,
      price_override_amount: variant.priceOverrideAmount ?? null,
      is_enabled: variant.isEnabled !== false,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function replaceProductLocations(input: {
  productId: string;
  storeId: string;
  formData: FormData;
}) {
  const selectedLocationIds = input.formData
    .getAll("productLocationIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const supabaseAdmin = createSupabaseAdminClient();
  const { error: deleteError } = await (supabaseAdmin as any)
    .from("product_locations")
    .delete()
    .eq("product_id", input.productId);

  if (deleteError) {
    if (isMissingTableError(deleteError)) {
      return;
    }

    throw new Error(deleteError.message);
  }

  if (selectedLocationIds.length === 0) {
    return;
  }

  const { data: locations, error: locationsError } = await (supabaseAdmin as any)
    .from("store_locations")
    .select("id,store_id")
    .in("id", selectedLocationIds);

  if (locationsError) {
    if (isMissingTableError(locationsError)) {
      return;
    }

    throw new Error(locationsError.message);
  }

  const allowedLocations = new Set(
    ((locations ?? []) as Array<{ id: string; store_id: string }>)
      .filter((location) => location.store_id === input.storeId)
      .map((location) => location.id),
  );

  if (allowedLocations.size !== selectedLocationIds.length) {
    throw new Error("Seçilən satış nöqtələrindən biri bu mağazaya aid deyil.");
  }

  const rows = selectedLocationIds.map((locationId) => {
    const stock = Math.max(
      Math.trunc(Number(input.formData.get(`locationStock:${locationId}`) ?? 0) || 0),
      0,
    );

    return {
      product_id: input.productId,
      location_id: locationId,
      stock_quantity: stock,
      is_available: stock > 0,
    };
  });

  const { error } = await (supabaseAdmin as any)
    .from("product_locations")
    .insert(rows);

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
  const costAmount = readNumber(formData, "costAmount");
  const priceAmount = readNumber(formData, "priceAmount");
  const discountedPriceRaw = readString(formData, "discountedPriceAmount");
  const discountAmount =
    discountedPriceRaw.length > 0
      ? Math.max(priceAmount - readNumber(formData, "discountedPriceAmount"), 0)
      : readNumber(formData, "discountAmount");
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
  const variantConfig = parseVariantConfig(formData);
  const variants = variantConfig.legacyVariants;
  const depositEnabled = false;
  const depositType = "fixed";
  const depositValue = 0;

  return {
    name,
    nameTranslations,
    categoryId: categoryId || null,
    costAmount,
    priceAmount,
    discountAmount,
    stockQuantity,
    description,
    descriptionTranslations,
    seoTitleTranslations,
    seoDescriptionTranslations,
    status,
    variants,
    variantOptions: variantConfig.options,
    variantCombinations: variantConfig.combinations,
    depositEnabled,
    depositType,
    depositValue,
  };
}

function validatePayload(payload: ReturnType<typeof readProductPayload>) {
  if (!payload.name) {
    return "Ad mütləqdir.";
  }

  if (payload.costAmount < 0 || payload.priceAmount < 0 || payload.discountAmount < 0) {
    return "Maya dəyəri, qiymət və endirim mənfi ola bilməz.";
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
      message: "Məhsul limitiniz dolub.",
    };
  }

  const imageFiles = getImageFiles(formData);

  try {
    await assertStoreImageLimit({
      storeId,
      nextImageCount: imageFiles.length,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Şəkil limiti yoxlanmadı.",
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
      cost_amount: payload.costAmount,
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
        variant_options: payload.variantOptions,
        variant_combinations: payload.variantCombinations,
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
    await replaceVariants({
      productId: product.id,
      options: payload.variantOptions,
      combinations: payload.variantCombinations,
      legacyVariants: payload.variants,
    });
    await replaceProductLocations({
      productId: product.id,
      storeId,
      formData,
    });
    await uploadProductImages({
      userId: current.user.id,
      productId: product.id,
      productName: payload.name,
      files: imageFiles,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Şəkil yüklənmədi.",
    };
  }

  const storeSlug = stores.find((store) => store.id === storeId)?.slug ?? null;

  revalidatePath("/store/dashboard/products");
  revalidateMarketplaceSurfaces({
    productId: product.id,
    storeId,
    categoryId: payload.categoryId,
    storeSlug,
    homepage: payload.status === "active",
  });

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
    .select("id,store_id,owner_id,category_id,listing_type,metadata,stores(slug,owner_id)")
    .eq("id", productId)
    .maybeSingle();

  if (!existing) {
    return {
      ok: false,
      message: "Məhsul tapılmadı.",
    };
  }

  const existingStore = Array.isArray(existing.stores)
    ? existing.stores[0]
    : existing.stores;

  if (
    current.role !== "admin" &&
    existing.owner_id !== current.user.id &&
    existingStore?.owner_id !== current.user.id
  ) {
    return {
      ok: false,
      message: "Bu məhsul üzərində icazəniz yoxdur.",
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
          variant_options: payload.variantOptions,
          variant_combinations: payload.variantCombinations,
        }
      : {
          variants: payload.variants,
          variant_options: payload.variantOptions,
          variant_combinations: payload.variantCombinations,
        };
  let replacedImageUrls: Array<string | null> = [];

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
      cost_amount: payload.costAmount,
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
    await replaceVariants({
      productId,
      options: payload.variantOptions,
      combinations: payload.variantCombinations,
      legacyVariants: payload.variants,
    });
    if (existing.listing_type === "store") {
      await replaceProductLocations({
        productId,
        storeId: existing.store_id,
        formData,
      });
    }
    replacedImageUrls = await replaceProductImages({
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
  revalidatePath("/radmin/products");
  revalidatePath("/radmin/stores");
  revalidateMarketplaceSurfaces({
    productId,
    storeId: existing.store_id,
    categoryId: payload.categoryId ?? existing.category_id,
    storeSlug: existingStore?.slug,
    homepage: status === "active" || existing.metadata?.featured === true,
  });
  await deleteR2ImagesByUrls(replacedImageUrls);

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
  const [{ data: productImages }, { data: existing }] = await Promise.all([
    (supabase as any)
    .from("product_images")
    .select("url")
      .eq("product_id", productId),
    (supabase as any)
      .from("products")
      .select("id,store_id,category_id,status,stores(slug)")
      .eq("id", productId)
      .maybeSingle(),
  ]);
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
  revalidatePath("/radmin/products");
  revalidatePath("/radmin/stores");
  revalidateMarketplaceSurfaces({
    productId,
    storeId: existing?.store_id,
    categoryId: existing?.category_id,
    storeSlug: Array.isArray(existing?.stores)
      ? existing?.stores[0]?.slug
      : existing?.stores?.slug,
    homepage: existing?.status === "active",
  });
  await deleteR2ImagesByUrls(
    ((productImages ?? []) as Array<{ url: string | null }>).map((image) => image.url),
  );

  return {
    ok: true,
    message: "Məhsul silindi.",
  };
}

export async function deleteProductImageAction(
  formData: FormData,
): Promise<ProductActionResult> {
  const current = await requireRole(
    ["seller", "customer", "admin"],
    "/dashboard/listings",
  );
  const imageId = readString(formData, "imageId");

  if (!imageId) {
    return {
      ok: false,
      message: "Şəkil tapılmadı.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: image } = await (supabaseAdmin as any)
    .from("product_images")
    .select("id,product_id,url")
    .eq("id", imageId)
    .maybeSingle();

  if (!image) {
    return {
      ok: false,
      message: "Şəkil tapılmadı.",
    };
  }

  const { data: product } = await (supabaseAdmin as any)
    .from("products")
    .select("id,owner_id,store_id,category_id,status,stores(slug)")
    .eq("id", image.product_id)
    .maybeSingle();

  if (!product || (current.role !== "admin" && product.owner_id !== current.user.id)) {
    return {
      ok: false,
      message: "Bu şəkli silmək icazəniz yoxdur.",
    };
  }

  const { error } = await (supabaseAdmin as any)
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/store/dashboard/products");
  revalidatePath("/dashboard/listings");
  revalidatePath("/radmin/products");
  revalidateMarketplaceSurfaces({
    productId: image.product_id,
    storeId: product.store_id,
    categoryId: product.category_id,
    storeSlug: Array.isArray(product.stores)
      ? product.stores[0]?.slug
      : product.stores?.slug,
    homepage: product.status === "active",
  });
  await deleteR2ImageByUrl(image.url);

  return {
    ok: true,
    message: "Şəkil silindi.",
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
        provider: "manual_personal_listing",
        amount: 1,
        currency: "AZN",
        status: "pending",
        metadata: {
          purpose: "personal_listing_activation",
          payment_mode: "manual_pending",
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
        cost_amount: payload.costAmount,
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
          variant_options: payload.variantOptions,
          variant_combinations: payload.variantCombinations,
        },
      })
      .select("id")
      .single();

    if (productError || !product) {
      throw new Error(productError?.message ?? "Elan yaradıla bilmədi.");
    }

    await replaceVariants({
      productId: product.id,
      options: payload.variantOptions,
      combinations: payload.variantCombinations,
      legacyVariants: payload.variants,
    });
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
  revalidateMarketplaceSurfaces();

  return {
    ok: true,
    message: "Elan yaradıldı. Aktivləşməsi üçün 1 AZN ödəniş təsdiqi gözlənilir.",
  };
}

export async function confirmPersonalListingPaymentAction(
  formData: FormData,
): Promise<ProductActionResult> {
  await requireRole(["admin"], "/radmin/products");
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
        payment_mode: "manual_admin_confirmed",
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
    .eq("listing_type", "personal");

  if (productError) {
    return {
      ok: false,
      message: productError.message,
    };
  }

  revalidatePath("/dashboard/listings");
  revalidateMarketplaceSurfaces();

  return {
    ok: true,
    message: "1 AZN ödəniş admin tərəfindən təsdiqləndi və elan aktivləşdi.",
  };
}

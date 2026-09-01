"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import {
  assertAuthRateLimit,
  getClientIp,
  recordAuthRateLimitAttempt,
} from "@/lib/auth/security";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { ensureAuthProfile } from "@/lib/auth/profiles";
import { trackActivityEvent } from "@/lib/activity/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  sendCustomerOrderCreatedEmail,
  sendSellerOrderCreatedEmail,
  type OrderEmailItem,
} from "@/lib/email/order";
import { normalizeAzerbaijanPhone } from "@/lib/phone";
import { getCartProducts } from "@/lib/cart/data";
import { notifyOrderCreated } from "@/lib/telegram/notifications";
import type {
  CartItem,
  CheckoutActionResult,
  WhatsAppCheckoutGroup,
} from "@/lib/cart/types";
import type { CheckoutPromoPreview } from "@/lib/promos/types";
import type { ProductOptionType } from "@/lib/products/types";
import { getGlobalWhatsAppOrderTemplate } from "@/lib/whatsapp-orders/data";
import {
  normalizeOrderMethod,
  renderWhatsAppOrderTemplate,
  toWhatsAppPhone,
} from "@/lib/whatsapp-orders/template";
import {
  findMatchingProductVariant,
  formatProductVariantSelection,
  getAutoProductVariantSelection,
  getEnabledProductOptions,
  getProductVariantKey,
  getProductVariantUnitPrice,
  normalizeProductVariantSelection,
} from "@/lib/products/variant-utils";

const MAX_CHECKOUT_ITEMS = 50;
const MAX_CHECKOUT_QUANTITY = 1000;
const DELIVERY_METHODS = ["pickup", "courier", "region"] as const;
type DeliveryMethod = (typeof DELIVERY_METHODS)[number];
type ValidatedCartVariantItem = CartItem & {
  product: Awaited<ReturnType<typeof getCartProducts>>[number];
  selectedVariant: NonNullable<
    Awaited<ReturnType<typeof getCartProducts>>[number]["variantCombinations"]
  >[number] | null;
  unitPrice: number;
  variantLabels: string[];
  variantSnapshot: Array<{
    type: ProductOptionType;
    name: string;
    value: string;
    colorHex: string | null;
  }>;
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function hashCheckoutIdentity(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isValidNormalizedPhone(value: string) {
  return /^\+994 \d{2} \d{3} \d{2} \d{2}$/.test(value);
}

function parseCartItems(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    const grouped = new Map<string, CartItem>();

    if (!Array.isArray(parsed)) {
      return {
        items: [],
        tooManyItems: false,
        invalidItems: true,
      };
    }

    if (parsed.length > MAX_CHECKOUT_ITEMS) {
      return {
        items: [],
        tooManyItems: true,
        invalidItems: false,
      };
    }

    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        return {
          items: [],
          tooManyItems: false,
          invalidItems: true,
        };
      }

      const productId = (item as CartItem).productId;
      const quantity = (item as CartItem).quantity;
      const selectedOptions = normalizeProductVariantSelection(
        (item as CartItem).selectedOptions,
      );

      if (
        typeof productId !== "string" ||
        !UUID_PATTERN.test(productId) ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        quantity > MAX_CHECKOUT_QUANTITY
      ) {
        return {
          items: [],
          tooManyItems: false,
          invalidItems: true,
        };
      }

      const itemKey = getProductVariantKey(productId, selectedOptions);
      const current = grouped.get(itemKey);
      const nextQuantity = (current?.quantity ?? 0) + quantity;

      if (nextQuantity > MAX_CHECKOUT_QUANTITY) {
        return {
          items: [],
          tooManyItems: false,
          invalidItems: true,
        };
      }

      grouped.set(itemKey, {
        productId,
        quantity: nextQuantity,
        selectedOptions,
        variantKey: itemKey,
      });
    }

    return {
      items: Array.from(grouped.values()),
      tooManyItems: false,
      invalidItems: false,
    };
  } catch {
    return {
      items: [],
      tooManyItems: false,
      invalidItems: true,
    };
  }
}

async function validateCartVariantSelections(items: CartItem[]) {
  const products = await getCartProducts(
    Array.from(new Set(items.map((item) => item.productId))),
    "az",
  );
  const productMap = new Map(products.map((product) => [product.id, product]));
  const validated = [];

  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      return {
        ok: false as const,
        message: "Səbətdə aktiv olmayan məhsul var.",
      };
    }

    const selection = {
      ...getAutoProductVariantSelection(product.options ?? []),
      ...normalizeProductVariantSelection(item.selectedOptions),
    };
    const enabledOptions = getEnabledProductOptions(product.options ?? []);

    for (const option of enabledOptions) {
      if (option.values.length === 0) {
        continue;
      }

      const selectedValue = selection[option.type];

      if (option.values.length > 1 && !selectedValue) {
        return {
          ok: false as const,
          message: "Məhsul variantı seçilməyib.",
        };
      }

      if (
        selectedValue &&
        !option.values.some((value) => value.value === selectedValue)
      ) {
        return {
          ok: false as const,
          message: "Məhsul variantı yanlışdır.",
        };
      }
    }

    const selectedVariant = findMatchingProductVariant(
      product.variantCombinations ?? [],
      selection,
    );

    if (
      (product.variantCombinations ?? []).length > 0 &&
      enabledOptions.length > 0 &&
      !selectedVariant
    ) {
      return {
        ok: false as const,
        message: "Bu variant kombinasiyası mövcud deyil.",
      };
    }

    if (selectedVariant && selectedVariant.stockQuantity < item.quantity) {
      return {
        ok: false as const,
        message: "Seçilmiş variant üçün stok kifayət deyil.",
      };
    }

    const unitPrice = getProductVariantUnitPrice({
      priceAmount: product.priceAmount,
      discountAmount: product.discountAmount,
      variants: product.variantCombinations,
      selection,
    });
    const variantLabels = formatProductVariantSelection(product.options, selection);

    validated.push({
      ...item,
      selectedOptions: selection,
      variantKey: getProductVariantKey(item.productId, selection),
      product,
      selectedVariant,
      unitPrice,
      variantLabels,
      variantSnapshot: enabledOptions.reduce<
        Array<{
          type: ProductOptionType;
          name: string;
          value: string;
          colorHex: string | null;
        }>
      >((snapshot, option) => {
          const value = option.values.find(
            (optionValue) => optionValue.value === selection[option.type],
          );

          if (value) {
            snapshot.push({
                type: option.type,
                name: option.name,
                value: value.value,
                colorHex: value.colorHex ?? null,
            });
          }

          return snapshot;
        }, []),
    });
  }

  return {
    ok: true as const,
    items: validated,
  };
}

async function applyOrderVariantSnapshots(input: {
  orderIds: string[];
  items: ValidatedCartVariantItem[];
}) {
  if (input.orderIds.length === 0 || input.items.length === 0) {
    return;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: orders } = await (supabaseAdmin as any)
    .from("orders")
    .select(
      "id,store_id,delivery_amount,shipping_amount,order_items(id,product_id,quantity,metadata)",
    )
    .in("id", input.orderIds);

  for (const order of (orders ?? []) as Array<{
    id: string;
    store_id: string;
    delivery_amount?: string | number | null;
    shipping_amount?: string | number | null;
    order_items?: Array<{
      id: string;
      product_id: string | null;
      quantity: number;
      metadata?: Record<string, unknown> | null;
    }>;
  }>) {
    const existingHasVariantSnapshot = (order.order_items ?? []).some((item) =>
      Boolean(item.metadata?.variant_key),
    );

    if (existingHasVariantSnapshot) {
      continue;
    }

    let subtotal = 0;

    for (const orderItem of order.order_items ?? []) {
      const desiredItems = input.items.filter(
        (item) =>
          item.productId === orderItem.product_id &&
          item.product.storeId === order.store_id,
      );

      if (desiredItems.length === 0) {
        continue;
      }

      const [first, ...rest] = desiredItems;
      const firstTotal = first.unitPrice * first.quantity;
      subtotal += firstTotal;

      await (supabaseAdmin as any)
        .from("order_items")
        .update({
          quantity: first.quantity,
          unit_price_amount: first.unitPrice,
          total_amount: firstTotal,
          product_sku: first.selectedVariant?.sku ?? null,
          metadata: {
            ...(orderItem.metadata ?? {}),
            variant_key: first.variantKey,
            selected_options: first.selectedOptions,
            variant_snapshot: first.variantSnapshot,
          },
        })
        .eq("id", orderItem.id);

      for (const item of rest) {
        const lineTotal = item.unitPrice * item.quantity;
        subtotal += lineTotal;

        await (supabaseAdmin as any).from("order_items").insert({
          order_id: order.id,
          product_id: item.productId,
          product_name: item.product.name,
          product_sku: item.selectedVariant?.sku ?? null,
          quantity: item.quantity,
          unit_price_amount: item.unitPrice,
          total_amount: lineTotal,
          metadata: {
            variant_key: item.variantKey,
            selected_options: item.selectedOptions,
            variant_snapshot: item.variantSnapshot,
          },
        });
      }

      for (const item of desiredItems) {
        if (!item.selectedVariant?.id) {
          continue;
        }

        const { data: variantRow } = await (supabaseAdmin as any)
          .from("product_variants")
          .select("stock_quantity")
          .eq("id", item.selectedVariant.id)
          .maybeSingle();
        const currentStock = Number(variantRow?.stock_quantity ?? 0);

        await (supabaseAdmin as any)
          .from("product_variants")
          .update({
            stock_quantity: Math.max(currentStock - item.quantity, 0),
          })
          .eq("id", item.selectedVariant.id);
      }
    }

    const deliveryAmount = Number(order.delivery_amount ?? order.shipping_amount ?? 0);

    if (subtotal > 0) {
      await (supabaseAdmin as any)
        .from("orders")
        .update({
          subtotal_amount: subtotal,
          total_amount: subtotal + deliveryAmount,
        })
        .eq("id", order.id);
    }
  }
}

async function applyOrderPromoSnapshots(input: {
  orderIds: string[];
  promosByStore: Map<string, AppliedPromo>;
}) {
  if (input.orderIds.length === 0 || input.promosByStore.size === 0) {
    return;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: orders } = await (supabaseAdmin as any)
    .from("orders")
    .select("id,store_id,subtotal_amount,shipping_amount,delivery_amount,metadata")
    .in("id", input.orderIds);

  await Promise.all(
    ((orders ?? []) as Array<{
      id: string;
      store_id: string;
      subtotal_amount: string | number | null;
      shipping_amount: string | number | null;
      delivery_amount: string | number | null;
      metadata?: Record<string, unknown> | null;
    }>).map(async (order) => {
      const promo = input.promosByStore.get(order.store_id);

      if (!promo) {
        return;
      }

      const subtotal = Number(order.subtotal_amount ?? promo.subtotal);
      const deliveryAmount = Number(order.delivery_amount ?? order.shipping_amount ?? 0);
      const totalAfterDiscount = Math.max(subtotal - promo.discountAmount, 0);

      await (supabaseAdmin as any)
        .from("orders")
        .update({
          discount_amount: promo.discountAmount,
          total_amount: totalAfterDiscount + deliveryAmount,
          metadata: {
            ...(order.metadata ?? {}),
            promo: {
              promo_id: promo.promoId,
              promo_code: promo.code,
              promo_discount_percent: promo.discountPercent,
              promo_discount_amount: promo.discountAmount,
              subtotal_before_discount: subtotal,
              total_after_discount: totalAfterDiscount,
            },
          },
        })
        .eq("id", order.id);
    }),
  );
}

async function areOrderEmailNotificationsEnabled() {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await (supabaseAdmin as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();
  const value = data?.value?.order_email_notifications_enabled;

  return typeof value === "boolean" ? value : true;
}

async function sendOrderEmailNotifications(orderIds: string[]) {
  if (orderIds.length === 0 || !(await areOrderEmailNotificationsEnabled())) {
    return;
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: orders } = await (supabaseAdmin as any)
    .from("orders")
    .select(
      "id,order_number,user_id,total_amount,currency,stores(id,name,owner_id),order_items(product_name,quantity,unit_price_amount,total_amount)",
    )
    .in("id", orderIds);

  const typedOrders = (orders ?? []) as Array<{
    id: string;
    order_number: string | null;
    user_id: string | null;
    total_amount: string | number | null;
    currency: string | null;
    stores?: {
      id: string;
      name: string | null;
      owner_id: string | null;
    } | null;
    order_items?: Array<{
      product_name: string | null;
      quantity: number | null;
      unit_price_amount: string | number | null;
      total_amount: string | number | null;
    }>;
  }>;
  const profileIds = Array.from(
    new Set(
      typedOrders
        .flatMap((order) => [order.user_id, order.stores?.owner_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const { data: profiles } =
    profileIds.length > 0
      ? await (supabaseAdmin as any)
          .from("profiles")
          .select("id,email,full_name")
          .in("id", profileIds)
      : { data: [] };
  const profileMap = new Map(
    ((profiles ?? []) as Array<{
      id: string;
      email: string | null;
      full_name: string | null;
    }>).map((profile) => [profile.id, profile]),
  );
  const tasks: Array<Promise<unknown>> = [];

  for (const order of typedOrders) {
    const buyer = order.user_id ? profileMap.get(order.user_id) : null;
    const seller = order.stores?.owner_id
      ? profileMap.get(order.stores.owner_id)
      : null;
    const currency = order.currency || "AZN";
    const items: OrderEmailItem[] = (order.order_items ?? []).map((item) => ({
      name: item.product_name || "Məhsul",
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price_amount ?? 0),
      totalAmount: Number(item.total_amount ?? 0),
    }));
    const input = {
      orderNumber: order.order_number || order.id,
      storeName: order.stores?.name || "Mağaza",
      customerName: buyer?.full_name || buyer?.email || "Müştəri",
      totalAmount: Number(order.total_amount ?? 0),
      currency,
      items,
    };

    if (buyer?.email) {
      tasks.push(sendCustomerOrderCreatedEmail({ ...input, to: buyer.email }));
    }

    if (seller?.email) {
      tasks.push(sendSellerOrderCreatedEmail({ ...input, to: seller.email }));
    }
  }

  await Promise.allSettled(tasks);
}

function scheduleOrderEmailNotifications(orderIds: string[]) {
  if (orderIds.length === 0) {
    return;
  }

  after(async () => {
    await sendOrderEmailNotifications(orderIds);
  });
}

export async function getCartProductsAction(productIds: string[], locale = "az") {
  const uniqueProductIds = Array.from(
    new Set(productIds.filter((productId) => UUID_PATTERN.test(productId))),
  ).slice(0, MAX_CHECKOUT_ITEMS);

  return getCartProducts(uniqueProductIds, locale);
}

export async function getAvailablePromoStoreIdsAction(storeIds: string[]) {
  const uniqueStoreIds = Array.from(
    new Set(storeIds.filter((storeId) => UUID_PATTERN.test(storeId))),
  ).slice(0, MAX_CHECKOUT_ITEMS);

  if (uniqueStoreIds.length === 0) {
    return [];
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await (supabaseAdmin as any)
    .from("seller_promo_codes")
    .select("store_id,starts_at,ends_at,created_at")
    .in("store_id", uniqueStoreIds)
    .eq("is_active", true)
    .is("deleted_at", null);
  const now = Date.now();
  const availableStoreIds = new Set<string>();

  for (const promo of (data ?? []) as Array<{
    store_id: string | null;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string | null;
  }>) {
    if (!promo.store_id) {
      continue;
    }

    const startsAt = promo.starts_at ? Date.parse(promo.starts_at) : Number.NaN;
    const createdAt = promo.created_at ? Date.parse(promo.created_at) : Number.NaN;
    const endsAt = promo.ends_at ? Date.parse(promo.ends_at) : Number.NaN;
    const hasStarted =
      !Number.isFinite(startsAt) ||
      startsAt - now <= 60_000 ||
      isLikelyLegacyBakuPromoStartShift({ startsAt, createdAt, now });
    const hasNotExpired = !Number.isFinite(endsAt) || endsAt >= now;

    if (hasStarted && hasNotExpired) {
      availableStoreIds.add(promo.store_id);
    }
  }

  return Array.from(availableStoreIds);
}

export async function previewCheckoutPromosAction(formData: FormData): Promise<
  | {
      ok: true;
      promos: CheckoutPromoPreview[];
    }
  | {
      ok: false;
      message: string;
    }
> {
  const cart = parseCartItems(readString(formData, "items"));

  if (cart.invalidItems || cart.items.length === 0) {
    return {
      ok: false,
      message: "Səbət məlumatları yanlışdır.",
    };
  }

  const validatedVariants = await validateCartVariantSelections(cart.items);

  if (!validatedVariants.ok) {
    return {
      ok: false,
      message: validatedVariants.message,
    };
  }

  const groups = groupValidatedItemsByStore(validatedVariants.items);
  const storeSettings = await getCheckoutStoreSettings(Array.from(groups.keys()));
  const resolvedPromos = await resolveCheckoutPromos({
    groups,
    storeSettings,
    promoCodes: parsePromoCodes(readString(formData, "promoCodes")),
  });

  if (!resolvedPromos.ok) {
    return {
      ok: false,
      message: resolvedPromos.message,
    };
  }

  return {
    ok: true,
    promos: Array.from(resolvedPromos.promos.values()).map((promo) => ({
      storeId: promo.storeId,
      code: promo.code,
      discountPercent: promo.discountPercent,
      subtotal: promo.subtotal,
      discountAmount: promo.discountAmount,
      totalAfterDiscount: promo.totalAfterDiscount,
    })),
  };
}

function getCheckoutErrorMessage(message?: string) {
  if (!message) {
    return "Sifariş yaradıla bilmədi.";
  }

  if (message.includes("INSUFFICIENT_STOCK")) {
    return "Stok kifayət deyil.";
  }

  if (message.includes("PRODUCT_UNAVAILABLE")) {
    return "Səbətdə aktiv olmayan məhsul var.";
  }

  if (message.includes("DELIVERY_METHOD_UNAVAILABLE")) {
    return "Seçilmiş çatdırılma üsulu hazırda aktiv deyil.";
  }

  if (message.includes("INVALID_DELIVERY")) {
    return "Çatdırılma seçimi yanlışdır.";
  }

  if (
    message.includes("INVALID_CHECKOUT") ||
    message.includes("INVALID_CART") ||
    message.includes("CHECKOUT_NOT_ALLOWED") ||
    message.includes("AUTH_REQUIRED")
  ) {
    return "Sifariş məlumatları yanlışdır.";
  }

  return "Sifariş yaradıla bilmədi.";
}

function parseCheckoutResponse(value: unknown) {
  const data = value as
    | {
        orderIds?: unknown;
        orders?: Array<{
          id?: unknown;
          storeId?: unknown;
          orderNumber?: unknown;
          totalAmount?: unknown;
          itemCount?: unknown;
        }>;
      }
    | null
    | undefined;

  return {
    orderIds: Array.isArray(data?.orderIds)
      ? data.orderIds.filter((id): id is string => typeof id === "string")
      : [],
    orders: Array.isArray(data?.orders) ? data.orders : [],
  };
}

async function containsOwnStoreProduct(input: {
  userId: string;
  productIds: string[];
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await (supabaseAdmin as any)
    .from("products")
    .select("id,stores(owner_id)")
    .in("id", input.productIds);

  return ((data ?? []) as Array<{
    stores?: { owner_id?: string | null } | Array<{ owner_id?: string | null }> | null;
  }>).some((row) => {
    const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;

    return store?.owner_id === input.userId;
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}

function deliveryMethodLabel(method: DeliveryMethod) {
  if (method === "pickup") {
    return "Mağazadan götürmə";
  }

  if (method === "region") {
    return "Rayonlara çatdırılma";
  }

  return "Bakı daxili kuryer";
}

function readSettings(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizePromoCode(value: string) {
  return value.trim().toUpperCase();
}

function parsePromoCodes(value: string): Map<string, string> {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return new Map<string, string>();
    }

    const entries: Array<[string, string]> = Object.entries(
      parsed as Record<string, unknown>,
    )
      .map(([storeId, code]): [string, string] => [
        storeId,
        typeof code === "string" ? normalizePromoCode(code) : "",
      ])
      .filter(([storeId, code]) => UUID_PATTERN.test(storeId) && code.length > 0);

    return new Map<string, string>(
      entries,
    );
  } catch {
    return new Map<string, string>();
  }
}

async function getCheckoutStoreSettings(
  storeIds: string[],
): Promise<Map<string, CheckoutStoreSetting>> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await (supabaseAdmin as any)
    .from("stores")
    .select("id,name,owner_id,settings")
    .in("id", storeIds);

  return new Map(
    ((data ?? []) as Array<{
      id: string;
      name: string | null;
      owner_id: string | null;
      settings?: Record<string, unknown> | null;
    }>).map((store) => {
      const settings = readSettings(store.settings);
      const whatsappPhone =
        typeof settings.whatsappPhone === "string" ? settings.whatsappPhone : "";

      return [
        store.id,
        {
          id: store.id,
          name: store.name || "Satıcı",
          sellerId: store.owner_id as string | null,
          orderMethod: normalizeOrderMethod(settings.orderMethod),
          whatsappPhone: toWhatsAppPhone(whatsappPhone),
        },
      ];
    }),
  );
}

function groupValidatedItemsByStore(items: ValidatedCartVariantItem[]) {
  const groups = new Map<string, ValidatedCartVariantItem[]>();

  for (const item of items) {
    const current = groups.get(item.product.storeId) ?? [];

    current.push(item);
    groups.set(item.product.storeId, current);
  }

  return groups;
}

function getGroupSubtotal(items: ValidatedCartVariantItem[]) {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

type CheckoutStoreSetting = {
  id: string;
  name: string;
  sellerId: string | null;
  orderMethod: "system" | "whatsapp";
  whatsappPhone: string;
};

type AppliedPromo = CheckoutPromoPreview & {
  promoId: string;
  sellerId: string;
};

function isLikelyLegacyBakuPromoStartShift(input: {
  startsAt: number;
  createdAt: number;
  now: number;
}) {
  if (!Number.isFinite(input.createdAt)) {
    return false;
  }

  const deltaFromCreate = input.startsAt - input.createdAt;
  const deltaFromNow = input.startsAt - input.now;

  return (
    deltaFromCreate >= 3.75 * 60 * 60 * 1000 &&
    deltaFromCreate <= 4.25 * 60 * 60 * 1000 &&
    deltaFromNow > 0 &&
    deltaFromNow <= 4.25 * 60 * 60 * 1000
  );
}

async function resolveCheckoutPromos(input: {
  groups: Map<string, ValidatedCartVariantItem[]>;
  storeSettings: Map<string, CheckoutStoreSetting>;
  promoCodes: Map<string, string>;
}) {
  const requested = Array.from(input.promoCodes.entries()).filter(([storeId]) =>
    input.groups.has(storeId),
  );
  const result = new Map<string, AppliedPromo>();

  if (requested.length === 0) {
    return {
      ok: true as const,
      promos: result,
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();

  for (const [storeId, code] of requested) {
    const settings = input.storeSettings.get(storeId);

    if (!settings?.sellerId) {
      return {
        ok: false as const,
        message: "Promo kod etibarsızdır.",
      };
    }

    const { data: promo } = await (supabaseAdmin as any)
      .from("seller_promo_codes")
      .select("id,seller_id,code,code_normalized,discount_percent,starts_at,ends_at,is_active,created_at")
      .eq("seller_id", settings.sellerId)
      .eq("code_normalized", code)
      .is("deleted_at", null)
      .maybeSingle();

    if (!promo) {
      return {
        ok: false as const,
        message: "Promo kod etibarsızdır.",
      };
    }

    const now = Date.now();
    const startsAt = Date.parse(promo.starts_at);
    const createdAt = Date.parse(promo.created_at);
    const endsAt = promo.ends_at ? Date.parse(promo.ends_at) : Number.NaN;
    const discountPercent = Number(promo.discount_percent ?? 0);

    if (!promo.is_active || discountPercent < 1 || discountPercent > 100) {
      return {
        ok: false as const,
        message: "Promo kod etibarsızdır.",
      };
    }

    if (
      Number.isFinite(startsAt) &&
      startsAt - now > 60_000 &&
      !isLikelyLegacyBakuPromoStartShift({ startsAt, createdAt, now })
    ) {
      return {
        ok: false as const,
        message: "Promo kod hələ aktiv deyil.",
      };
    }

    if (Number.isFinite(endsAt) && endsAt < now) {
      return {
        ok: false as const,
        message: "Promo kodun istifadə müddəti bitib.",
      };
    }

    const subtotal = getGroupSubtotal(input.groups.get(storeId) ?? []);
    const discountAmount = Math.round(subtotal * discountPercent) / 100;

    result.set(storeId, {
      promoId: promo.id,
      sellerId: promo.seller_id,
      storeId,
      code: promo.code,
      discountPercent,
      subtotal,
      discountAmount,
      totalAfterDiscount: Math.max(subtotal - discountAmount, 0),
    });
  }

  return {
    ok: true as const,
    promos: result,
  };
}

function buildWhatsAppCheckoutGroup(input: {
  storeId: string;
  sellerName: string;
  whatsappPhone: string;
  template: string;
  items: ValidatedCartVariantItem[];
  promo: AppliedPromo | null;
  fullName: string;
  phone: string;
  address: string;
  deliveryMethod: DeliveryMethod;
}) {
  const now = new Date();
  const products = input.items.map((item) => {
    const totalAmount = item.unitPrice * item.quantity;

    return {
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalAmount,
      variantLabels: item.variantLabels,
    };
  });
  const totalAmount = products.reduce((sum, product) => sum + product.totalAmount, 0);
  const productsText = products
    .map((product, index) =>
      [
        `${index + 1}. ${product.name}`,
        product.variantLabels.length > 0 ? `   ${product.variantLabels.join(" · ")}` : "",
        `   ${product.quantity} ədəd × ${formatMoney(product.unitPrice)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
  const firstProduct = products[0];
  const promo = input.promo;
  const finalTotal = promo?.totalAfterDiscount ?? totalAmount;
  const message = renderWhatsAppOrderTemplate(input.template, {
    order_number: `WA-${now.getTime()}`,
    customer_name: input.fullName,
    customer_phone: input.phone,
    seller_name: input.sellerName,
    store_name: input.sellerName,
    product_name: firstProduct?.name ?? "",
    products: productsText,
    quantity: String(products.reduce((sum, product) => sum + product.quantity, 0)),
    price: firstProduct ? formatMoney(firstProduct.unitPrice) : "",
    total: formatMoney(finalTotal),
    delivery_method: deliveryMethodLabel(input.deliveryMethod),
    address: input.deliveryMethod === "pickup" ? "" : input.address,
    date: new Intl.DateTimeFormat("az-AZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(now),
    time: new Intl.DateTimeFormat("az-AZ", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(now),
    promo_code: promo?.code ?? "",
    discount_percent: promo ? String(promo.discountPercent) : "",
    discount_amount: promo ? formatMoney(promo.discountAmount) : "",
    subtotal: formatMoney(totalAmount),
    total_after_discount: formatMoney(finalTotal),
  }, {
    promo: Boolean(promo),
  });

  return {
    storeId: input.storeId,
    sellerName: input.sellerName,
    storeName: input.sellerName,
    subtotalAmount: totalAmount,
    discountAmount: promo?.discountAmount ?? 0,
    totalAmount: finalTotal,
    itemCount: products.reduce((sum, product) => sum + product.quantity, 0),
    itemKeys: input.items.map(
      (item) => item.variantKey ?? getProductVariantKey(item.productId, item.selectedOptions),
    ),
    whatsappUrl: `https://wa.me/${input.whatsappPhone}?text=${encodeURIComponent(message)}`,
    promo: promo
      ? {
          code: promo.code,
          discountPercent: promo.discountPercent,
          discountAmount: promo.discountAmount,
        }
      : null,
    products,
  } satisfies WhatsAppCheckoutGroup;
}

export async function createCheckoutOrdersAction(
  formData: FormData,
): Promise<CheckoutActionResult> {
  const current = await getCurrentUserProfile();
  const isGuestCheckout = !current;

  if (current && current.role !== "customer" && current.role !== "seller") {
    return {
      ok: false,
      message: "Sifariş üçün istifadəçi hesabı lazımdır.",
    };
  }

  const submittedFullName = readString(formData, "fullName");
  const submittedPhone = normalizeAzerbaijanPhone(readString(formData, "phone"));
  const profileFullName =
    current?.profile?.full_name?.trim() || current?.user.email?.trim() || "";
  const profilePhone = normalizeAzerbaijanPhone(current?.profile?.phone ?? "");
  const fullName = current ? profileFullName || submittedFullName : submittedFullName;
  const phone = current ? profilePhone || submittedPhone : submittedPhone;
  const address = readString(formData, "address");
  const note = readString(formData, "note");
  const deliveryMethodInput = readString(formData, "deliveryMethod").toLowerCase();
  const deliveryMethod = DELIVERY_METHODS.includes(
    deliveryMethodInput as DeliveryMethod,
  )
    ? (deliveryMethodInput as DeliveryMethod)
    : null;
  const deliveryRegion = readString(formData, "deliveryRegion");
  const checkoutRequestId = readString(formData, "checkoutRequestId");
  const checkoutFlow = readString(formData, "checkoutFlow");
  const forceSystemOrder = checkoutFlow === "direct_whatsapp_button";
  const promoCodes = parsePromoCodes(readString(formData, "promoCodes"));
  const cart = parseCartItems(readString(formData, "items"));
  const items = cart.items;

  if (
    fullName.length < 2 ||
    fullName.length > 120 ||
    !isValidNormalizedPhone(phone) ||
    !deliveryMethod ||
    (deliveryMethod !== "pickup" && address.length < 5) ||
    address.length > 500 ||
    (deliveryMethod === "region" &&
      (deliveryRegion.length < 2 || deliveryRegion.length > 120)) ||
    note.length > 1000
  ) {
    return {
      ok: false,
      message: current
        ? "Profilinizdə ad soyad və düzgün telefon nömrəsi olmalıdır."
        : "Ad soyad, düzgün telefon və ünvan mütləqdir.",
    };
  }

  if (cart.invalidItems || (checkoutRequestId && !UUID_PATTERN.test(checkoutRequestId))) {
    return {
      ok: false,
      message: "Sifariş məlumatları yanlışdır.",
    };
  }

  if (items.length === 0) {
    return {
      ok: false,
      message: cart.tooManyItems
        ? "Bir sifarişdə maksimum 50 məhsul ola bilər."
        : "Səbət boşdur.",
    };
  }

  const validatedVariants = await validateCartVariantSelections(items);

  if (!validatedVariants.ok) {
    return {
      ok: false,
      message: validatedVariants.message,
    };
  }

  if (
    current?.role === "seller" &&
    (await containsOwnStoreProduct({
      userId: current.user.id,
      productIds: Array.from(new Set(items.map((item) => item.productId))),
    }))
  ) {
    return {
      ok: false,
      message: "Öz mağazanızdan məhsul almaq mümkün deyil.",
    };
  }

  if (current) {
    await ensureAuthProfile({
      id: current.user.id,
      email: current.user.email ?? null,
      fullName,
      phone,
      role: current.role,
    });
  }

  const ip = await getClientIp();
  const checkoutIdentityKey = isGuestCheckout
    ? hashCheckoutIdentity(`guest:${ip}:${phone}`)
    : null;

  if (isGuestCheckout) {
    const rateLimit = await assertAuthRateLimit({
      endpoint: "guest_checkout",
      identifier: phone,
      ip,
      maxAttempts: 5,
      windowSeconds: 15 * 60,
      blockSeconds: 15 * 60,
    });

    if (!rateLimit.ok) {
      return {
        ok: false,
        message: rateLimit.message,
      };
    }

    await recordAuthRateLimitAttempt({
      endpoint: "guest_checkout",
      identifier: phone,
      ip,
      maxAttempts: 5,
      windowSeconds: 15 * 60,
      blockSeconds: 15 * 60,
    });
  }

  const groupedByStore = groupValidatedItemsByStore(validatedVariants.items);
  const storeSettings = await getCheckoutStoreSettings(Array.from(groupedByStore.keys()));
  const resolvedPromos = await resolveCheckoutPromos({
    groups: groupedByStore,
    storeSettings,
    promoCodes,
  });

  if (!resolvedPromos.ok) {
    return {
      ok: false,
      message: resolvedPromos.message,
    };
  }

  const whatsappTemplate = await getGlobalWhatsAppOrderTemplate();
  const systemItems: ValidatedCartVariantItem[] = [];
  const whatsappGroups: WhatsAppCheckoutGroup[] = [];

  for (const [storeId, storeItems] of groupedByStore.entries()) {
    const settings = storeSettings.get(storeId);

    if (!settings) {
      return {
        ok: false,
        message: "Satıcı məlumatı tapılmadı.",
      };
    }

    if (!forceSystemOrder && settings.orderMethod === "whatsapp") {
      if (!settings.whatsappPhone) {
        return {
          ok: false,
          message:
            "Satıcının WhatsApp nömrəsi düzgün təyin edilməyib. Zəhmət olmasa başqa sifariş üsulu seçin.",
        };
      }

      whatsappGroups.push(
        buildWhatsAppCheckoutGroup({
          storeId,
          sellerName: settings.name,
          whatsappPhone: settings.whatsappPhone,
          template: whatsappTemplate,
          items: storeItems,
          promo: resolvedPromos.promos.get(storeId) ?? null,
          fullName,
          phone,
          address,
          deliveryMethod,
        }),
      );
      continue;
    }

    systemItems.push(...storeItems);
  }

  let checkout = {
    orderIds: [] as string[],
    orders: [] as Array<{
      id?: unknown;
      storeId?: unknown;
      orderNumber?: unknown;
      totalAmount?: unknown;
      itemCount?: unknown;
    }>,
  };

  if (systemItems.length > 0) {
    const supabaseAdmin = createSupabaseAdminClient();
    const systemCartItems = systemItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions,
      variantKey: item.variantKey,
    }));
    const { data, error } = await (supabaseAdmin as any).rpc(
      "create_atomic_checkout_orders",
      {
        p_items: systemCartItems,
        p_full_name: fullName,
        p_phone: phone,
        p_address: address,
        p_notes: note || null,
        p_request_id: checkoutRequestId || null,
        p_delivery_method: deliveryMethod,
        p_delivery_region: deliveryRegion || null,
        p_user_id: current?.user.id ?? null,
        p_checkout_identity_key: checkoutIdentityKey,
      },
    );

    if (error) {
      return {
        ok: false,
        message: getCheckoutErrorMessage(error.message),
      };
    }

    checkout = parseCheckoutResponse(data);
  }

  await applyOrderVariantSnapshots({
    orderIds: checkout.orderIds,
    items: systemItems,
  });
  await applyOrderPromoSnapshots({
    orderIds: checkout.orderIds,
    promosByStore: resolvedPromos.promos,
  });

  await Promise.all(
    [
      ...checkout.orders.map((order) =>
        trackActivityEvent({
          eventType: "order_created",
          actorId: current?.user.id ?? null,
          storeId: typeof order.storeId === "string" ? order.storeId : null,
          metadata: {
            title: "Yeni sifariş",
            description:
              typeof order.orderNumber === "string" ? order.orderNumber : "Sifariş",
            order_id: typeof order.id === "string" ? order.id : null,
            order_number:
              typeof order.orderNumber === "string" ? order.orderNumber : null,
            total_amount:
              typeof order.totalAmount === "number" ? order.totalAmount : null,
            item_count: typeof order.itemCount === "number" ? order.itemCount : null,
          },
        }),
      ),
      ...whatsappGroups.map((group) =>
        trackActivityEvent({
          eventType: "whatsapp_order_intent",
          actorId: current?.user.id ?? null,
          storeId: group.storeId,
          metadata: {
            title: "WhatsApp sifariş niyyəti",
            description: `${group.storeName} · ${formatMoney(group.totalAmount)}`,
            total_amount: group.totalAmount,
            item_count: group.itemCount,
          },
        }),
      ),
    ],
  );

  if (checkout.orderIds.length > 0) {
    void notifyOrderCreated(checkout.orderIds);
    scheduleOrderEmailNotifications(checkout.orderIds);
  }

  if (checkout.orderIds.length > 0) {
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");
    revalidatePath("/store/dashboard/orders");
    revalidatePath("/admin/orders");
    revalidatePath("/radmin/orders");
  }

  revalidatePath("/radmin/activity");

  const processedItemKeys = systemItems.map((item) =>
    item.variantKey ?? getProductVariantKey(item.productId, item.selectedOptions),
  );
  const hasSystemOrders = checkout.orderIds.length > 0;
  const hasWhatsAppOrders = whatsappGroups.length > 0;
  const message = hasSystemOrders
    ? hasWhatsAppOrders
      ? "Sayt sifarişləri yaradıldı. WhatsApp satıcıları üçün sifarişi ayrıca tamamlayın."
      : isGuestCheckout
        ? "Sifariş yaradıldı. Sizinlə tezliklə əlaqə saxlanılacaq."
        : "Sifariş yaradıldı."
    : "WhatsApp sifarişləri hazırlandı. Hər satıcı üçün sifarişi ayrıca tamamlayın.";

  return {
    ok: true,
    message,
    orderIds: checkout.orderIds,
    processedItemKeys,
    orders: checkout.orders,
    whatsappGroups,
    isGuest: isGuestCheckout,
  };
}

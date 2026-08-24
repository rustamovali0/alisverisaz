"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  assertAuthRateLimit,
  getClientIp,
  recordAuthRateLimitAttempt,
} from "@/lib/auth/security";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { ensureAuthProfile } from "@/lib/auth/profiles";
import { trackActivityEvent } from "@/lib/activity/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeAzerbaijanPhone } from "@/lib/phone";
import { getCartProducts } from "@/lib/cart/data";
import type { CartItem, CheckoutActionResult } from "@/lib/cart/types";
import type { ProductOptionType } from "@/lib/products/types";
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

export async function getCartProductsAction(productIds: string[], locale = "az") {
  const uniqueProductIds = Array.from(
    new Set(productIds.filter((productId) => UUID_PATTERN.test(productId))),
  ).slice(0, MAX_CHECKOUT_ITEMS);

  return getCartProducts(uniqueProductIds, locale);
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

  const fullName = readString(formData, "fullName");
  const phone = normalizeAzerbaijanPhone(readString(formData, "phone"));
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
      message: "Ad soyad, düzgün telefon və ünvan mütləqdir.",
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
      fullName: current.profile?.full_name ?? null,
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

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any).rpc(
    "create_atomic_checkout_orders",
    {
      p_items: items,
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

  const checkout = parseCheckoutResponse(data);

  await applyOrderVariantSnapshots({
    orderIds: checkout.orderIds,
    items: validatedVariants.items,
  });

  await Promise.all(
    checkout.orders.map((order) =>
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
  );

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  revalidatePath("/store/dashboard/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/radmin/orders");
  revalidatePath("/radmin/activity");

  return {
    ok: true,
    message: isGuestCheckout
      ? "Sifariş yaradıldı. Sifarişinizi izləmək üçün hesab yaradın."
      : "Sifariş yaradıldı.",
    orderIds: checkout.orderIds,
    orders: checkout.orders,
    isGuest: isGuestCheckout,
  };
}

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

const MAX_CHECKOUT_ITEMS = 50;
const MAX_CHECKOUT_QUANTITY = 1000;
const DELIVERY_METHODS = ["pickup", "courier", "region"] as const;
type DeliveryMethod = (typeof DELIVERY_METHODS)[number];
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
    const grouped = new Map<string, number>();

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

      const nextQuantity = (grouped.get(productId) ?? 0) + quantity;

      if (nextQuantity > MAX_CHECKOUT_QUANTITY) {
        return {
          items: [],
          tooManyItems: false,
          invalidItems: true,
        };
      }

      grouped.set(productId, nextQuantity);
    }

    return {
      items: Array.from(grouped, ([productId, quantity]) => ({
        productId,
        quantity,
      })),
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

  if (
    current?.role === "seller" &&
    (await containsOwnStoreProduct({
      userId: current.user.id,
      productIds: items.map((item) => item.productId),
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

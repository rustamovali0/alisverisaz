"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { ensureAuthProfile } from "@/lib/auth/profiles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CartItem, CheckoutActionResult } from "@/lib/cart/types";

const MAX_CHECKOUT_ITEMS = 50;

type CheckoutProduct = {
  id: string;
  store_id: string;
  name: string;
  sku: string | null;
  price_amount: string | number;
  discount_amount: string | number | null;
  stock_quantity: number;
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function parseCartItems(value: string) {
  try {
    const parsed = JSON.parse(value) as CartItem[];
    const grouped = new Map<string, number>();

    if (parsed.length > MAX_CHECKOUT_ITEMS) {
      return {
        items: [],
        tooManyItems: true,
      };
    }

    parsed
      .filter((item) => item.productId && Number.isFinite(Number(item.quantity)))
      .forEach((item) => {
        const quantity = Math.max(Math.trunc(Number(item.quantity)), 1);
        grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + quantity);
      });

    return {
      items: Array.from(grouped, ([productId, quantity]) => ({
        productId,
        quantity,
      })),
      tooManyItems: false,
    };
  } catch {
    return {
      items: [],
      tooManyItems: false,
    };
  }
}

function getUnitPrice(product: CheckoutProduct) {
  return Math.max(Number(product.price_amount) - Number(product.discount_amount ?? 0), 0);
}

function createOrderNumber() {
  return `AZ-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

async function ensureCustomer(input: {
  storeId: string;
  userId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  let existingQuery = (supabaseAdmin as any)
    .from("customers")
    .select("id")
    .eq("store_id", input.storeId);

  existingQuery = input.userId
    ? existingQuery.eq("user_id", input.userId)
    : existingQuery.is("user_id", null).eq("phone", input.phone);

  const { data: existing } = await existingQuery.limit(1).maybeSingle();

  if (existing) {
    await (supabaseAdmin as any)
      .from("customers")
      .update({
        full_name: input.fullName,
        phone: input.phone,
        email: input.email,
      })
      .eq("id", existing.id);

    return existing.id as string;
  }

  const { data: customer, error } = await (supabaseAdmin as any)
    .from("customers")
    .insert({
      store_id: input.storeId,
      user_id: input.userId,
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
    })
    .select("id")
    .single();

  if (error || !customer) {
    throw new Error(error?.message ?? "Müştəri qeydi yaradıla bilmədi.");
  }

  return customer.id as string;
}

export async function createCheckoutOrdersAction(
  formData: FormData,
): Promise<CheckoutActionResult> {
  const current = await requireRole(["customer"], "/cart");
  await ensureAuthProfile({
    id: current.user.id,
    email: current.user.email ?? null,
    fullName: current.profile?.full_name ?? null,
    role: current.role,
  });

  const fullName = readString(formData, "fullName");
  const phone = readString(formData, "phone");
  const address = readString(formData, "address");
  const note = readString(formData, "note");
  const cart = parseCartItems(readString(formData, "items"));
  const items = cart.items;

  if (!fullName || !phone || !address) {
    return {
      ok: false,
      message: "Ad soyad, telefon və ünvan mütləqdir.",
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

  const supabaseAdmin = createSupabaseAdminClient();
  const productIds = items.map((item) => item.productId);
  const { data: products, error: productError } = await (supabaseAdmin as any)
    .from("products")
    .select("id,store_id,name,sku,price_amount,discount_amount,stock_quantity")
    .eq("status", "active")
    .in("id", productIds);

  if (productError) {
    return {
      ok: false,
      message: productError.message,
    };
  }

  const productMap = new Map(
    ((products ?? []) as CheckoutProduct[]).map((product) => [product.id, product]),
  );
  const grouped = new Map<string, Array<{ product: CheckoutProduct; quantity: number }>>();

  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      return {
        ok: false,
        message: "Səbətdə aktiv olmayan məhsul var.",
      };
    }

    if (item.quantity > product.stock_quantity) {
      return {
        ok: false,
        message: `${product.name} üçün stok kifayət etmir.`,
      };
    }

    const storeItems = grouped.get(product.store_id) ?? [];
    storeItems.push({
      product,
      quantity: item.quantity,
    });
    grouped.set(product.store_id, storeItems);
  }

  const orderIds: string[] = [];

  try {
    for (const [storeId, storeItems] of grouped) {
      const customerId = await ensureCustomer({
        storeId,
        userId: current.user.id,
        fullName,
        phone,
        email: current.user.email ?? null,
      });
      const subtotal = storeItems.reduce(
        (total, item) => total + getUnitPrice(item.product) * item.quantity,
        0,
      );
      const { data: order, error: orderError } = await (supabaseAdmin as any)
        .from("orders")
        .insert({
          store_id: storeId,
          customer_id: customerId,
          user_id: current.user.id,
          order_number: createOrderNumber(),
          status: "pending",
          payment_status: "pending",
          subtotal_amount: subtotal,
          total_amount: subtotal,
          currency: "AZN",
          shipping_address: {
            full_name: fullName,
            phone,
            address,
          },
          notes: note,
        })
        .select("id")
        .single();

      if (orderError || !order) {
        throw new Error(orderError?.message ?? "Sifariş yaradıla bilmədi.");
      }

      orderIds.push(order.id);

      const { error: itemError } = await (supabaseAdmin as any)
        .from("order_items")
        .insert(
          storeItems.map((item) => {
            const unitPrice = getUnitPrice(item.product);

            return {
              order_id: order.id,
              product_id: item.product.id,
              product_name: item.product.name,
              product_sku: item.product.sku,
              quantity: item.quantity,
              unit_price_amount: unitPrice,
              total_amount: unitPrice * item.quantity,
            };
          }),
        );

      if (itemError) {
        throw new Error(itemError.message);
      }
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Sifariş yaradıla bilmədi.",
    };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/store/dashboard/orders");
  revalidatePath("/admin/orders");

  return {
    ok: true,
    message: "Sifariş yaradıldı.",
    orderIds,
  };
}

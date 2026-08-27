import { getSystemFlag } from "@/lib/platform/system-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram/api";

function formatDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();

  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(amount: unknown, currency = "AZN") {
  const value = Number(amount ?? 0);

  return `${Number.isFinite(value) ? value.toFixed(2) : "0.00"} ${currency}`;
}

function readAddress(order: any) {
  const shippingAddress =
    order?.shipping_address && typeof order.shipping_address === "object"
      ? order.shipping_address
      : {};

  return (
    order?.delivery_address ||
    shippingAddress.address ||
    (order?.delivery_method === "pickup" ? "Mağazadan özün götürmə" : "-")
  );
}

function readCustomer(order: any) {
  const shippingAddress =
    order?.shipping_address && typeof order.shipping_address === "object"
      ? order.shipping_address
      : {};
  const customer = Array.isArray(order?.customers)
    ? order.customers[0]
    : order?.customers;

  return {
    name: customer?.full_name || shippingAddress.full_name || "-",
    phone: customer?.phone || shippingAddress.phone || "-",
    email: customer?.email || "-",
  };
}

function formatDeliveryMethod(value: unknown) {
  if (value === "pickup") {
    return "Mağazadan özün götürmə";
  }

  if (value === "region") {
    return "Region çatdırılması";
  }

  return "Çatdırılma";
}

async function sendIfEnabled(flag: Parameters<typeof getSystemFlag>[0], text: string) {
  if (!(await getSystemFlag(flag))) {
    return;
  }

  await sendTelegramMessage({ text });
}

export async function notifyOrderCreated(orderIds: string[]) {
  if (!orderIds.length) {
    return;
  }

  try {
    if (!(await getSystemFlag("order_notifications_enabled"))) {
      return;
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await (supabase as any)
      .from("orders")
      .select(
        [
          "id",
          "order_number",
          "status",
          "total_amount",
          "currency",
          "shipping_amount",
          "delivery_method",
          "delivery_region",
          "delivery_address",
          "shipping_address",
          "created_at",
          "customers(full_name,phone,email)",
          "stores(name,slug)",
          "order_items(product_name,quantity,unit_price_amount,total_amount)",
        ].join(","),
      )
      .in("id", orderIds)
      .order("created_at", { ascending: false });

    if (error) {
      await sendTelegramMessage({
        text: `🛒 <b>Yeni sifariş</b>\nOrder ID: ${escapeHtml(orderIds.join(", "))}`,
      });
      return;
    }

    for (const order of (data ?? []) as any[]) {
      const customer = readCustomer(order);
      const store = Array.isArray(order.stores) ? order.stores[0] : order.stores;
      const items = ((order.order_items ?? []) as any[])
        .map(
          (item) =>
            `• ${escapeHtml(item.product_name)} x${escapeHtml(item.quantity)} — ${escapeHtml(
              formatMoney(item.total_amount, order.currency),
            )}`,
        )
        .join("\n");

      await sendTelegramMessage({
        text: [
          "🛒 <b>Yeni sifariş</b>",
          `№: <b>${escapeHtml(order.order_number)}</b>`,
          `Müştəri: ${escapeHtml(customer.name)}`,
          `Telefon: ${escapeHtml(customer.phone)}`,
          `Seller: ${escapeHtml(store?.name ?? "-")}`,
          `Məhsullar:\n${items || "-"}`,
          `Çatdırılma: ${escapeHtml(formatDeliveryMethod(order.delivery_method))}`,
          `Ünvan: ${escapeHtml(readAddress(order))}`,
          `Status: ${escapeHtml(order.status)}`,
          `Total: <b>${escapeHtml(formatMoney(order.total_amount, order.currency))}</b>`,
          `Tarix: ${escapeHtml(formatDate(order.created_at))}`,
        ].join("\n"),
      });
    }
  } catch {
    // Telegram failures must not affect checkout.
  }
}

export async function notifyUserRegistered(input: {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  createdAt?: string | null;
}) {
  await sendIfEnabled(
    "user_notifications_enabled",
    [
      "👤 <b>Yeni user qeydiyyatı</b>",
      `ID: ${escapeHtml(input.id)}`,
      `Ad: ${escapeHtml(input.fullName || "-")}`,
      `Telefon/email: ${escapeHtml(input.phone || input.email || "-")}`,
      `Tarix: ${escapeHtml(formatDate(input.createdAt))}`,
    ].join("\n"),
  );
}

export async function notifySellerRegistered(input: {
  id: string;
  storeName: string;
  sellerName: string;
  phone?: string | null;
  email?: string | null;
  createdAt?: string | null;
  status?: string | null;
}) {
  await sendIfEnabled(
    "seller_notifications_enabled",
    [
      "🏪 <b>Yeni seller müraciəti</b>",
      `ID: ${escapeHtml(input.id)}`,
      `Mağaza/seller: ${escapeHtml(input.storeName || input.sellerName || "-")}`,
      `Telefon/email: ${escapeHtml(input.phone || input.email || "-")}`,
      `Status: ${escapeHtml(input.status || "pending")}`,
      `Tarix: ${escapeHtml(formatDate(input.createdAt))}`,
    ].join("\n"),
  );
}

export async function notifyAdminLogin(input: {
  adminId?: string | null;
  login: string;
  name?: string | null;
  role: string;
  ip: string;
  userAgent?: string | null;
  createdAt?: string | null;
}) {
  await sendIfEnabled(
    "admin_notifications_enabled",
    [
      "🔐 <b>Admin login uğurlu</b>",
      `Admin: ${escapeHtml(input.name || input.login)}`,
      `Login: ${escapeHtml(input.login)}`,
      `Role: ${escapeHtml(input.role)}`,
      `IP: ${escapeHtml(input.ip)}`,
      `User-agent: ${escapeHtml(input.userAgent || "-")}`,
      `Tarix: ${escapeHtml(formatDate(input.createdAt))}`,
    ].join("\n"),
  );
}

export async function notifyAdminLoginFailed(input: {
  login: string;
  reason?: string;
  ip: string;
  userAgent?: string | null;
  createdAt?: string | null;
}) {
  await sendIfEnabled(
    "admin_notifications_enabled",
    [
      "⚠️ <b>Admin login cəhdi uğursuz</b>",
      `Login: ${escapeHtml(input.login || "-")}`,
      `Səbəb: ${escapeHtml(input.reason || "login_failed")}`,
      `IP: ${escapeHtml(input.ip)}`,
      `User-agent: ${escapeHtml(input.userAgent || "-")}`,
      `Tarix: ${escapeHtml(formatDate(input.createdAt))}`,
    ].join("\n"),
  );
}

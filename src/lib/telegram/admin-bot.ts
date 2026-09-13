import { createHash, randomBytes } from "node:crypto";

import { recordAdminAudit } from "@/lib/admin/audit";
import { invalidateProductPublicData } from "@/lib/cache/public-cache";
import {
  getAdminSessionStatus,
  revokeAdminSessions,
  revokeCustomerSessions,
  revokeSellerSessions,
} from "@/lib/admin/session-control";
import { serverEnv } from "@/lib/config/env.server";
import {
  getSystemFlags,
  setSystemFlag,
  type SystemFlagKey,
} from "@/lib/platform/system-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  answerTelegramCallback,
  deleteTelegramMessage,
  editTelegramMessage,
  escapeHtml,
  sendTelegramMessage,
  setTelegramCommandMenu,
} from "@/lib/telegram/api";
import { verifyTelegramAdminPassword } from "@/lib/telegram/password";
import {
  assertTelegramRateLimit,
  recordTelegramRateLimitAttempt,
  resetTelegramRateLimit,
  type TelegramRateScope,
} from "@/lib/telegram/rate-limit";

type TelegramChat = {
  id?: number | string;
  type?: string;
};

type TelegramUser = {
  id?: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  message_id?: number;
  text?: string;
  chat?: TelegramChat;
  from?: TelegramUser;
};

type TelegramCallbackQuery = {
  id?: string;
  data?: string;
  from?: TelegramUser;
  message?: TelegramMessage;
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type TelegramContext = {
  chatId: string;
  userId: string;
  messageId?: number;
  callbackQueryId?: string;
};

type ParsedCommand = {
  command: string;
  args: string;
};

type CommandConfig = {
  description: string;
  risk: "read" | "write" | "danger";
  confirm?: boolean;
};

const COMMANDS: Record<string, CommandConfig> = {
  "/orders": { description: "Son sifarişlər", risk: "read" },
  "/users": { description: "İstifadəçilər", risk: "read" },
  "/sales": { description: "Satıcılar", risk: "read" },
  "/notificationstatus": { description: "Bildiriş statusları", risk: "read" },
  "/adminstatus": { description: "Admin panel statusu", risk: "read" },
  "/systemstatus": { description: "Sistem statusu", risk: "read" },
  "/stoporder": { description: "Sifariş bildirişlərini söndür", risk: "write" },
  "/startorder": { description: "Sifariş bildirişlərini aç", risk: "write" },
  "/stopuser": { description: "User bildirişlərini söndür", risk: "write" },
  "/startuser": { description: "User bildirişlərini aç", risk: "write" },
  "/stopsales": { description: "Seller bildirişlərini söndür", risk: "write" },
  "/startsales": { description: "Seller bildirişlərini aç", risk: "write" },
  "/stopadmin": { description: "Admin bildirişlərini söndür", risk: "write" },
  "/startadmin": { description: "Admin bildirişlərini aç", risk: "write" },
  "/mehsulelave": { description: "Satıcı mağazasına məhsul əlavə et", risk: "write" },
  "/addproduct": { description: "Satıcı mağazasına məhsul əlavə et", risk: "write" },
  "/logoutadmin": { description: "Admin sessiyalarını bağla", risk: "danger", confirm: true },
  "/offlineadmin": { description: "Admin paneli deaktiv et", risk: "danger", confirm: true },
  "/onlineadmin": { description: "Admin paneli aktiv et", risk: "danger" },
  "/dangerseller": { description: "Seller panellərini bağla", risk: "danger", confirm: true },
  "/safeseller": { description: "Seller panellərini aç", risk: "danger" },
  "/dangeruser": { description: "User girişlərini bağla", risk: "danger", confirm: true },
  "/safeuser": { description: "User girişlərini aç", risk: "danger" },
  "/dangersite": { description: "Saytı maintenance rejiminə keçir", risk: "danger", confirm: true },
  "/safesite": { description: "Saytı yenidən aç", risk: "danger" },
};

let commandMenuConfigured = false;

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isValidUpdate(value: unknown): value is TelegramUpdate {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as TelegramUpdate).update_id === "number" &&
      ((value as TelegramUpdate).message || (value as TelegramUpdate).callback_query),
  );
}

export function isTelegramUpdate(value: unknown): value is TelegramUpdate {
  return isValidUpdate(value);
}

function getMessageContext(message: TelegramMessage | undefined): TelegramContext | null {
  if (!message?.chat || !message.from) {
    return null;
  }

  if (message.chat.type !== "private") {
    return null;
  }

  const chatId = String(message.chat.id ?? "");
  const userId = String(message.from.id ?? "");

  if (
    !serverEnv.telegramAdminChatId ||
    !serverEnv.telegramAdminUserId ||
    chatId !== serverEnv.telegramAdminChatId ||
    userId !== serverEnv.telegramAdminUserId
  ) {
    return null;
  }

  return {
    chatId,
    userId,
    messageId: message.message_id,
  };
}

function getCallbackContext(callback: TelegramCallbackQuery | undefined): TelegramContext | null {
  if (!callback?.message?.chat || !callback.from) {
    return null;
  }

  if (callback.message.chat.type !== "private") {
    return null;
  }

  const chatId = String(callback.message.chat.id ?? "");
  const userId = String(callback.from.id ?? "");

  if (
    !serverEnv.telegramAdminChatId ||
    !serverEnv.telegramAdminUserId ||
    chatId !== serverEnv.telegramAdminChatId ||
    userId !== serverEnv.telegramAdminUserId
  ) {
    return null;
  }

  return {
    chatId,
    userId,
    messageId: callback.message.message_id,
    callbackQueryId: callback.id,
  };
}

function parseCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim();

  if (!trimmed.startsWith("/")) {
    return null;
  }

  const [rawCommand, ...rest] = trimmed.split(/\s+/);
  const command = rawCommand.split("@")[0].toLowerCase();

  if (!COMMANDS[command]) {
    return null;
  }

  return {
    command,
    args: rest.join(" ").trim(),
  };
}

function getRateRule(command: string, ctx: TelegramContext) {
  const risk = COMMANDS[command]?.risk ?? "read";

  if (risk === "danger") {
    return {
      scope: "danger" as const,
      telegramUserId: ctx.userId,
      telegramChatId: ctx.chatId,
      maxAttempts: 3,
      windowSeconds: 60,
      blockSeconds: 5 * 60,
    };
  }

  if (risk === "write") {
    return {
      scope: "write" as const,
      telegramUserId: ctx.userId,
      telegramChatId: ctx.chatId,
      maxAttempts: 8,
      windowSeconds: 60,
      blockSeconds: 5 * 60,
    };
  }

  return {
    scope: "read" as const,
    telegramUserId: ctx.userId,
    telegramChatId: ctx.chatId,
    maxAttempts: 20,
    windowSeconds: 60,
    blockSeconds: 2 * 60,
  };
}

async function enforceRateLimit(command: string, ctx: TelegramContext) {
  const rule = getRateRule(command, ctx);
  const allowed = await assertTelegramRateLimit(rule);

  if (!allowed.ok) {
    await createUnlockChallenge(ctx, "command_rate_limit");
    return false;
  }

  await recordTelegramRateLimitAttempt(rule);
  return true;
}

async function configureCommandMenu() {
  if (commandMenuConfigured || !serverEnv.hasTelegramConfig) {
    return;
  }

  commandMenuConfigured = true;
  await setTelegramCommandMenu(
    Object.entries(COMMANDS).map(([command, config]) => ({
      command: command.slice(1),
      description: config.description,
    })),
  );
}

async function clearExpiredPendingActions() {
  const supabase = createSupabaseAdminClient();
  await (supabase as any)
    .from("telegram_pending_admin_actions")
    .delete()
    .lt("expires_at", new Date().toISOString());
}

async function createPasswordChallenge(ctx: TelegramContext, command: ParsedCommand) {
  const supabase = createSupabaseAdminClient();
  await clearExpiredPendingActions();
  await (supabase as any)
    .from("telegram_pending_admin_actions")
    .update({ used_at: new Date().toISOString() })
    .eq("telegram_user_id", ctx.userId)
    .eq("telegram_chat_id", ctx.chatId)
    .eq("phase", "password")
    .is("used_at", null);

  await (supabase as any).from("telegram_pending_admin_actions").insert({
    telegram_user_id: ctx.userId,
    telegram_chat_id: ctx.chatId,
    command: command.command,
    command_args: command.args || null,
    phase: "password",
    message_id: ctx.messageId ?? null,
    expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
  });

  await sendTelegramMessage({
    chatId: ctx.chatId,
    text: [
      "🔐 <b>Təhlükəsizlik yoxlaması</b>",
      "",
      "Əməliyyatı davam etdirmək üçün admin şifrəsini daxil edin.",
      "Ləğv etmək üçün /cancel yazın.",
    ].join("\n"),
  });
}

async function getPendingPasswordAction(ctx: TelegramContext) {
  const supabase = createSupabaseAdminClient();
  await clearExpiredPendingActions();
  const { data } = await (supabase as any)
    .from("telegram_pending_admin_actions")
    .select("id,command,command_args")
    .eq("telegram_user_id", ctx.userId)
    .eq("telegram_chat_id", ctx.chatId)
    .eq("phase", "password")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as { id: string; command: string; command_args: string | null } | null;
}

async function markPendingUsed(id: string) {
  const supabase = createSupabaseAdminClient();
  await (supabase as any)
    .from("telegram_pending_admin_actions")
    .update({ used_at: new Date().toISOString() })
    .eq("id", id);
}

async function cancelPendingActions(ctx: TelegramContext) {
  const supabase = createSupabaseAdminClient();
  await (supabase as any)
    .from("telegram_pending_admin_actions")
    .update({ used_at: new Date().toISOString() })
    .eq("telegram_user_id", ctx.userId)
    .eq("telegram_chat_id", ctx.chatId)
    .is("used_at", null);
  await sendTelegramMessage({
    chatId: ctx.chatId,
    text: "✅ Əməliyyat ləğv edildi.",
  });
}

async function createUnlockChallenge(ctx: TelegramContext, reason: string) {
  const supabase = createSupabaseAdminClient();
  await clearExpiredPendingActions();
  await (supabase as any)
    .from("telegram_pending_admin_actions")
    .update({ used_at: new Date().toISOString() })
    .eq("telegram_user_id", ctx.userId)
    .eq("telegram_chat_id", ctx.chatId)
    .eq("phase", "unlock")
    .is("used_at", null);

  if (!serverEnv.telegramAdminUnlockCodeHash) {
    await sendTelegramMessage({
      chatId: ctx.chatId,
      text: [
        "🚫 Çox sayda cəhd edildi. Admin komandaları müvəqqəti bloklandı.",
        "",
        "❌ TELEGRAM_ADMIN_UNLOCK_CODE_HASH ayarı tamamlanmayıb.",
        "Kodla açmaq üçün bu env dəyərini əlavə edin və ya blok vaxtının bitməsini gözləyin.",
      ].join("\n"),
    });
    return;
  }

  await (supabase as any).from("telegram_pending_admin_actions").insert({
    telegram_user_id: ctx.userId,
    telegram_chat_id: ctx.chatId,
    command: "/unlock",
    command_args: null,
    phase: "unlock",
    message_id: ctx.messageId ?? null,
    metadata: { reason },
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });

  await sendTelegramMessage({
    chatId: ctx.chatId,
    text: [
      "🚫 Çox sayda cəhd edildi. Admin komandaları müvəqqəti bloklandı.",
      "",
      "🔓 Cəhdləri sıfırlamaq üçün bərpa kodunu daxil edin.",
      "Ləğv etmək üçün /cancel yazın.",
    ].join("\n"),
  });
}

async function getPendingUnlockAction(ctx: TelegramContext) {
  const supabase = createSupabaseAdminClient();
  await clearExpiredPendingActions();
  const { data } = await (supabase as any)
    .from("telegram_pending_admin_actions")
    .select("id")
    .eq("telegram_user_id", ctx.userId)
    .eq("telegram_chat_id", ctx.chatId)
    .eq("phase", "unlock")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as { id: string } | null;
}

async function resetTelegramAdminAttempts(ctx: TelegramContext) {
  const scopes: TelegramRateScope[] = ["read", "write", "danger", "password", "unlock"];

  await Promise.all(
    scopes.map((scope) =>
      resetTelegramRateLimit({
        scope,
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
      }),
    ),
  );
}

async function createConfirmation(ctx: TelegramContext, command: ParsedCommand) {
  const token = randomBytes(18).toString("hex");
  const supabase = createSupabaseAdminClient();
  await (supabase as any).from("telegram_pending_admin_actions").insert({
    token_hash: hashValue(token),
    telegram_user_id: ctx.userId,
    telegram_chat_id: ctx.chatId,
    command: command.command,
    command_args: command.args || null,
    phase: "confirmation",
    expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
  });

  await sendTelegramMessage({
    chatId: ctx.chatId,
    text: [
      "⚠️ <b>Bu əməliyyat sistemə geniş təsir edəcək.</b>",
      "",
      `${escapeHtml(command.command)} əməliyyatını təsdiqləyirsiniz?`,
    ].join("\n"),
    replyMarkup: {
      inline_keyboard: [
        [
          { text: "✅ Təsdiq et", callback_data: `tgadmin:confirm:${token}` },
          { text: "❌ Ləğv et", callback_data: `tgadmin:cancel:${token}` },
        ],
      ],
    },
  });
}

async function getPendingConfirmation(ctx: TelegramContext, token: string) {
  const supabase = createSupabaseAdminClient();
  await clearExpiredPendingActions();
  const { data } = await (supabase as any)
    .from("telegram_pending_admin_actions")
    .select("id,command,command_args")
    .eq("telegram_user_id", ctx.userId)
    .eq("telegram_chat_id", ctx.chatId)
    .eq("phase", "confirmation")
    .eq("token_hash", hashValue(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return data as { id: string; command: string; command_args: string | null } | null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function boolStatus(value: boolean) {
  return value ? "Aktiv" : "Deaktiv";
}

function onlineStatus(value: boolean, offlineLabel = "Offline") {
  return value ? "Online" : offlineLabel;
}

function parsePage(args: string) {
  const page = Number(args.trim() || "1");

  return Number.isInteger(page) && page > 0 ? Math.min(page, 100) : 1;
}

function formatMoney(amount: unknown, currency = "AZN") {
  const value = Number(amount ?? 0);
  return `${Number.isFinite(value) ? value.toFixed(2) : "0.00"} ${currency}`;
}

function readOrderAddress(order: any) {
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

function readOrderCustomer(order: any) {
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
  };
}

function formatDelivery(value: unknown) {
  if (value === "pickup") {
    return "Mağazadan özün götürmə";
  }

  if (value === "region") {
    return "Region";
  }

  return "Çatdırılma";
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createProductSlug(value: string) {
  const slug = normalizeSlug(value);
  return `${slug || "mehsul"}-${randomBytes(4).toString("hex")}`;
}

function normalizeOptionalField(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed && trimmed !== "-" ? trimmed : null;
}

function parsePositivePrice(value: string) {
  const normalized = value.trim().replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

function parseStockQuantity(value: string) {
  const stock = Number.parseInt(value.trim(), 10);

  if (!Number.isInteger(stock) || stock < 0) {
    return null;
  }

  return stock;
}

function normalizeImageUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseAddProductArgs(args: string) {
  const parts = args.split("|").map((part) => part.trim());

  if (parts.length < 4) {
    return {
      ok: false as const,
      message: [
        "Format:",
        "<code>/mehsulelave mağaza | məhsul adı | qiymət | stok | kateqoriya | təsvir | şəkil_url</code>",
        "",
        "Nümunə:",
        "<code>/mehsulelave test-magaza | Telefon qabı | 12.50 | 20 | elektronika | Qara silikon qab | https://example.com/image.jpg</code>",
        "",
        "Boş hissə üçün <code>-</code> yazın.",
      ].join("\n"),
    };
  }

  const [storeRefRaw, nameRaw, priceRaw, stockRaw, categoryRefRaw, descriptionRaw, imageUrlRaw] =
    parts;
  const storeRef = storeRefRaw?.trim();
  const name = nameRaw?.trim();
  const priceAmount = parsePositivePrice(priceRaw ?? "");
  const stockQuantity = parseStockQuantity(stockRaw ?? "");
  const categoryRef = normalizeOptionalField(categoryRefRaw);
  const description = normalizeOptionalField(descriptionRaw);
  const imageUrl = normalizeImageUrl(normalizeOptionalField(imageUrlRaw));

  if (!storeRef || !name) {
    return {
      ok: false as const,
      message: "Mağaza və məhsul adı boş ola bilməz.",
    };
  }

  if (priceAmount === null) {
    return {
      ok: false as const,
      message: "Qiymət düzgün deyil. Məsələn: <code>12.50</code>",
    };
  }

  if (stockQuantity === null) {
    return {
      ok: false as const,
      message: "Stok düzgün deyil. Məsələn: <code>20</code>",
    };
  }

  if (imageUrlRaw && normalizeOptionalField(imageUrlRaw) && !imageUrl) {
    return {
      ok: false as const,
      message: "Şəkil URL-i düzgün deyil. Yalnız http/https link qəbul olunur.",
    };
  }

  return {
    ok: true as const,
    value: {
      storeRef,
      name,
      priceAmount,
      stockQuantity,
      categoryRef,
      description,
      imageUrl,
    },
  };
}

async function findStoreForTelegramProduct(storeRef: string) {
  const supabase = createSupabaseAdminClient();
  const trimmedRef = storeRef.trim();

  if (UUID_PATTERN.test(trimmedRef)) {
    const { data } = await (supabase as any)
      .from("stores")
      .select("id,owner_id,name,slug,status")
      .eq("id", trimmedRef)
      .maybeSingle();

    if (data) {
      return data as any;
    }
  }

  const slug = normalizeSlug(trimmedRef);
  const { data: bySlug } = await (supabase as any)
    .from("stores")
    .select("id,owner_id,name,slug,status")
    .eq("slug", slug)
    .maybeSingle();

  if (bySlug) {
    return bySlug as any;
  }

  const { data: byName } = await (supabase as any)
    .from("stores")
    .select("id,owner_id,name,slug,status")
    .ilike("name", trimmedRef)
    .limit(1)
    .maybeSingle();

  return (byName ?? null) as any | null;
}

async function findCategoryForTelegramProduct(categoryRef: string | null) {
  if (!categoryRef) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const trimmedRef = categoryRef.trim();

  if (UUID_PATTERN.test(trimmedRef)) {
    const { data } = await (supabase as any)
      .from("categories")
      .select("id,name,slug")
      .eq("id", trimmedRef)
      .maybeSingle();

    if (data) {
      return data as any;
    }
  }

  const slug = normalizeSlug(trimmedRef);
  const { data: bySlug } = await (supabase as any)
    .from("categories")
    .select("id,name,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (bySlug) {
    return bySlug as any;
  }

  const { data: byName } = await (supabase as any)
    .from("categories")
    .select("id,name,slug")
    .ilike("name", trimmedRef)
    .limit(1)
    .maybeSingle();

  return (byName ?? null) as any | null;
}

async function addSellerProductFromTelegram(args: string, ctx: TelegramContext) {
  const parsed = parseAddProductArgs(args);

  if (!parsed.ok) {
    return parsed.message;
  }

  const supabase = createSupabaseAdminClient();
  const store = await findStoreForTelegramProduct(parsed.value.storeRef);

  if (!store) {
    return [
      "Mağaza tapılmadı.",
      "Mağaza slug və ya ID-ni /sales komandası ilə yoxlayın.",
    ].join("\n");
  }

  const category = await findCategoryForTelegramProduct(parsed.value.categoryRef);

  if (parsed.value.categoryRef && !category) {
    return `Kateqoriya tapılmadı: ${escapeHtml(parsed.value.categoryRef)}`;
  }

  const { data: product, error } = await (supabase as any)
    .from("products")
    .insert({
      store_id: store.id,
      owner_id: store.owner_id,
      category_id: category?.id ?? null,
      name: parsed.value.name,
      name_translations: {},
      slug: createProductSlug(parsed.value.name),
      description: parsed.value.description,
      description_translations: {},
      seo_title_translations: {},
      seo_description_translations: {},
      price_amount: parsed.value.priceAmount,
      compare_at_price_amount: null,
      discount_amount: 0,
      stock_quantity: parsed.value.stockQuantity,
      status: "active",
      listing_type: "store",
      currency: "AZN",
      metadata: {
        source: "telegram_admin_bot",
        telegram_admin_user_id: ctx.userId,
        telegram_chat_id: ctx.chatId,
      },
    })
    .select("id,slug")
    .single();

  if (error || !product) {
    return `Məhsul yaradıla bilmədi: ${escapeHtml(error?.message ?? "Naməlum xəta")}`;
  }

  let imageMessage = "";

  if (parsed.value.imageUrl) {
    const { error: imageError } = await (supabase as any).from("product_images").insert({
      product_id: product.id,
      url: parsed.value.imageUrl,
      alt_text: parsed.value.name,
      sort_order: 0,
      is_primary: true,
    });

    imageMessage = imageError
      ? `\nŞəkil əlavə olunmadı: ${escapeHtml(imageError.message)}`
      : "\nŞəkil əlavə olundu.";
  }

  invalidateProductPublicData({
    productId: product.id,
    storeId: store.id,
    categoryId: category?.id ?? null,
    storeSlug: store.slug,
    homepage: true,
  });

  await recordAdminAudit({
    action: "TELEGRAM_PRODUCT_CREATED",
    telegramUserId: ctx.userId,
    telegramChatId: ctx.chatId,
    entityType: "products",
    entityId: product.id,
    metadata: {
      storeId: store.id,
      storeSlug: store.slug,
      name: parsed.value.name,
      priceAmount: parsed.value.priceAmount,
      stockQuantity: parsed.value.stockQuantity,
      categoryId: category?.id ?? null,
      hasImage: Boolean(parsed.value.imageUrl),
    },
  });

  return [
    "✅ <b>Məhsul əlavə olundu</b>",
    `Mağaza: ${escapeHtml(store.name)} (${escapeHtml(store.slug)})`,
    `Məhsul: ${escapeHtml(parsed.value.name)}`,
    `Qiymət: ${escapeHtml(formatMoney(parsed.value.priceAmount, "AZN"))}`,
    `Stok: ${escapeHtml(parsed.value.stockQuantity)}`,
    `Kateqoriya: ${escapeHtml(category?.name ?? "-")}`,
    `ID: <code>${escapeHtml(product.id)}</code>${imageMessage}`,
  ].join("\n");
}

async function listOrders(args: string) {
  const supabase = createSupabaseAdminClient();
  const page = parsePage(args);
  const limit = 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await (supabase as any)
    .from("orders")
    .select(
      [
        "id",
        "order_number",
        "status",
        "total_amount",
        "currency",
        "delivery_method",
        "delivery_address",
        "shipping_address",
        "created_at",
        "customers(full_name,phone)",
        "stores(name)",
        "order_items(product_name,quantity,total_amount)",
      ].join(","),
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return "Sifarişləri oxumaq mümkün olmadı.";
  }

  const rows = (data ?? []) as any[];
  const body = rows
    .map((order, index) => {
      const customer = readOrderCustomer(order);
      const store = Array.isArray(order.stores) ? order.stores[0] : order.stores;
      const items = ((order.order_items ?? []) as any[])
        .map((item) => `${item.product_name} x${item.quantity}`)
        .join(", ");

      return [
        `<b>${from + index + 1}. ${escapeHtml(order.order_number)}</b>`,
        `Seller: ${escapeHtml(store?.name ?? "-")}`,
        `Müştəri: ${escapeHtml(customer.name)} · ${escapeHtml(customer.phone)}`,
        `Məhsullar: ${escapeHtml(items || "-")}`,
        `Çatdırılma: ${escapeHtml(formatDelivery(order.delivery_method))}`,
        `Ünvan: ${escapeHtml(readOrderAddress(order))}`,
        `Status: ${escapeHtml(order.status)} · Total: ${escapeHtml(
          formatMoney(order.total_amount, order.currency),
        )}`,
        `Saat: ${escapeHtml(formatDate(order.created_at))}`,
      ].join("\n");
    })
    .join("\n\n");

  const total = Number(count ?? rows.length);
  const next = total > to + 1 ? `\n\nDavamı: /orders ${page + 1}` : "";

  return `🛒 <b>Son sifarişlər</b> (${escapeHtml(page)}. səhifə)\n\n${body || "Sifariş yoxdur."}${next}`;
}

async function listUsers(args: string) {
  const supabase = createSupabaseAdminClient();
  const page = parsePage(args);
  const limit = 15;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, count } = await (supabase as any)
    .from("profiles")
    .select("id,full_name,phone,email,role,created_at", { count: "exact" })
    .neq("role", "admin")
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = (data ?? []) as any[];
  const next = Number(count ?? rows.length) > to + 1 ? `\n\nDavamı: /users ${page + 1}` : "";

  return [
    `👤 <b>İstifadəçilər</b> (${escapeHtml(page)}. səhifə)`,
    "",
    rows
      .map(
        (user, index) =>
          `<b>${from + index + 1}. ${escapeHtml(user.full_name || "-")}</b>\nID: ${escapeHtml(
            user.id,
          )}\nTelefon: ${escapeHtml(user.phone || "-")}\nEmail: ${escapeHtml(
            user.email || "-",
          )}\nStatus: ${escapeHtml(user.role)}\nTarix: ${escapeHtml(
            formatDate(user.created_at),
          )}`,
      )
      .join("\n\n") || "User yoxdur.",
    next,
  ].join("\n");
}

async function listSellers(args: string) {
  const supabase = createSupabaseAdminClient();
  const page = parsePage(args);
  const limit = 15;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, count } = await (supabase as any)
    .from("stores")
    .select("id,owner_id,name,status,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = (data ?? []) as any[];
  const ownerIds = rows
    .map((store) => store.owner_id)
    .filter((id): id is string => typeof id === "string");
  const { data: owners } = ownerIds.length
    ? await (supabase as any)
        .from("profiles")
        .select("id,full_name,phone,email")
        .in("id", ownerIds)
    : { data: [] };
  const ownerMap = new Map(
    ((owners ?? []) as any[]).map((owner) => [owner.id, owner]),
  );
  const next = Number(count ?? rows.length) > to + 1 ? `\n\nDavamı: /sales ${page + 1}` : "";

  return [
    `🏪 <b>Satıcılar</b> (${escapeHtml(page)}. səhifə)`,
    "",
    rows
      .map((store, index) => {
        const owner = ownerMap.get(store.owner_id);

        return `<b>${from + index + 1}. ${escapeHtml(store.name)}</b>\nID: ${escapeHtml(
          store.id,
        )}\nSeller: ${escapeHtml(owner?.full_name || "-")}\nTelefon: ${escapeHtml(
          owner?.phone || "-",
        )}\nEmail: ${escapeHtml(owner?.email || "-")}\nStatus: ${escapeHtml(
          store.status,
        )}\nTarix: ${escapeHtml(formatDate(store.created_at))}`;
      })
      .join("\n\n") || "Seller yoxdur.",
    next,
  ].join("\n");
}

async function notificationStatus() {
  const flags = await getSystemFlags();

  return [
    "🔔 <b>Bildiriş statusları</b>",
    `🛒 Sifarişlər: ${boolStatus(flags.order_notifications_enabled)}`,
    `👤 User-lər: ${boolStatus(flags.user_notifications_enabled)}`,
    `🏪 Seller-lər: ${boolStatus(flags.seller_notifications_enabled)}`,
    `🔐 Admin login: ${boolStatus(flags.admin_notifications_enabled)}`,
  ].join("\n");
}

async function systemStatus() {
  const flags = await getSystemFlags();

  return [
    "🧭 <b>Sistem statusu</b>",
    `🌐 Sayt: ${flags.site_enabled ? "Online" : "Maintenance"}`,
    `🔐 Radmin: ${onlineStatus(flags.admin_panel_enabled)}`,
    `🏪 Seller panel: ${onlineStatus(flags.seller_panel_enabled)}`,
    `👤 User access: ${onlineStatus(flags.user_access_enabled)}`,
    "--------------------------------",
  ].join("\n");
}

async function adminStatus() {
  const [flags, sessionStatus] = await Promise.all([
    getSystemFlags(),
    getAdminSessionStatus(),
  ]);

  return [
    "🔐 <b>Admin panel statusu</b>",
    `Status: ${onlineStatus(flags.admin_panel_enabled)}`,
    `Aktiv admin session sayı: ${escapeHtml(sessionStatus.activeCount)}`,
    `Son admin login: ${escapeHtml(formatDate(sessionStatus.lastLoginAt))}`,
    "",
    await systemStatus(),
  ].join("\n");
}

async function updateNotificationFlag(input: {
  key: SystemFlagKey;
  enabled: boolean;
  action: string;
  ctx: TelegramContext;
}) {
  await setSystemFlag(input.key, input.enabled);
  await recordAdminAudit({
    action: input.action,
    telegramUserId: input.ctx.userId,
    telegramChatId: input.ctx.chatId,
    metadata: { key: input.key, enabled: input.enabled },
  });

  return `${input.enabled ? "✅ Aktiv edildi" : "⛔ Deaktiv edildi"}.`;
}

async function executeCommand(command: ParsedCommand, ctx: TelegramContext) {
  switch (command.command) {
    case "/orders":
      return listOrders(command.args);
    case "/users":
      return listUsers(command.args);
    case "/sales":
      return listSellers(command.args);
    case "/notificationstatus":
      return notificationStatus();
    case "/adminstatus":
      return adminStatus();
    case "/systemstatus":
      return systemStatus();
    case "/mehsulelave":
    case "/addproduct":
      return addSellerProductFromTelegram(command.args, ctx);
    case "/stoporder":
      return updateNotificationFlag({
        key: "order_notifications_enabled",
        enabled: false,
        action: "TELEGRAM_STOP_ORDER_NOTIFICATIONS",
        ctx,
      });
    case "/startorder":
      return updateNotificationFlag({
        key: "order_notifications_enabled",
        enabled: true,
        action: "TELEGRAM_START_ORDER_NOTIFICATIONS",
        ctx,
      });
    case "/stopuser":
      return updateNotificationFlag({
        key: "user_notifications_enabled",
        enabled: false,
        action: "TELEGRAM_STOP_USER_NOTIFICATIONS",
        ctx,
      });
    case "/startuser":
      return updateNotificationFlag({
        key: "user_notifications_enabled",
        enabled: true,
        action: "TELEGRAM_START_USER_NOTIFICATIONS",
        ctx,
      });
    case "/stopsales":
      return updateNotificationFlag({
        key: "seller_notifications_enabled",
        enabled: false,
        action: "TELEGRAM_STOP_SELLER_NOTIFICATIONS",
        ctx,
      });
    case "/startsales":
      return updateNotificationFlag({
        key: "seller_notifications_enabled",
        enabled: true,
        action: "TELEGRAM_START_SELLER_NOTIFICATIONS",
        ctx,
      });
    case "/stopadmin":
      return updateNotificationFlag({
        key: "admin_notifications_enabled",
        enabled: false,
        action: "TELEGRAM_STOP_ADMIN_NOTIFICATIONS",
        ctx,
      });
    case "/startadmin":
      return updateNotificationFlag({
        key: "admin_notifications_enabled",
        enabled: true,
        action: "TELEGRAM_START_ADMIN_NOTIFICATIONS",
        ctx,
      });
    case "/logoutadmin": {
      const result = await revokeAdminSessions();
      await recordAdminAudit({
        action: "ADMIN_LOGOUT_ALL",
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
        metadata: result,
      });
      return `✅ Bütün admin session-ları sonlandırıldı. (${result.revoked}/${result.requested})`;
    }
    case "/offlineadmin": {
      const result = await revokeAdminSessions();
      await setSystemFlag("admin_panel_enabled", false);
      await recordAdminAudit({
        action: "ADMIN_PANEL_OFFLINE",
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
        metadata: result,
      });
      return "🚨 Admin panel offline edildi.";
    }
    case "/onlineadmin":
      await setSystemFlag("admin_panel_enabled", true);
      await recordAdminAudit({
        action: "ADMIN_PANEL_ONLINE",
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
      });
      return "✅ Admin panel yenidən aktiv edildi.";
    case "/dangerseller": {
      const result = await revokeSellerSessions();
      await setSystemFlag("seller_panel_enabled", false);
      await recordAdminAudit({
        action: "SELLER_PANEL_DISABLED",
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
        metadata: result,
      });
      return "🚨 Bütün satıcı panellərinə giriş deaktiv edildi.\nSeller girişini yenidən açmaq üçün:\n/safeseller";
    }
    case "/safeseller":
      await setSystemFlag("seller_panel_enabled", true);
      await recordAdminAudit({
        action: "SELLER_PANEL_ENABLED",
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
      });
      return "✅ Satıcı panellərinə giriş yenidən aktiv edildi.";
    case "/dangeruser": {
      const result = await revokeCustomerSessions();
      await setSystemFlag("user_access_enabled", false);
      await recordAdminAudit({
        action: "USER_ACCESS_DISABLED",
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
        metadata: result,
      });
      return "🚨 İstifadəçi girişləri və qeydiyyatı deaktiv edildi.\nYenidən açmaq üçün:\n/safeuser";
    }
    case "/safeuser":
      await setSystemFlag("user_access_enabled", true);
      await recordAdminAudit({
        action: "USER_ACCESS_ENABLED",
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
      });
      return "✅ İstifadəçi girişləri yenidən aktiv edildi.";
    case "/dangersite":
      await setSystemFlag("site_enabled", false);
      await recordAdminAudit({
        action: "SITE_MAINTENANCE_ENABLED",
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
      });
      return "🚨 Sayt emergency maintenance rejiminə keçirildi.\nSaytı yenidən açmaq üçün:\n/safesite";
    case "/safesite":
      await setSystemFlag("site_enabled", true);
      await recordAdminAudit({
        action: "SITE_MAINTENANCE_DISABLED",
        telegramUserId: ctx.userId,
        telegramChatId: ctx.chatId,
      });
      return "✅ Sayt yenidən aktiv edildi.";
    default:
      return "Komanda tanınmadı.";
  }
}

async function handlePasswordMessage(message: TelegramMessage, ctx: TelegramContext) {
  const pending = await getPendingPasswordAction(ctx);

  if (!pending) {
    return;
  }

  if (ctx.messageId) {
    void deleteTelegramMessage({ chatId: ctx.chatId, messageId: ctx.messageId });
  }

  const passwordText = typeof message.text === "string" ? message.text.trim() : "";
  const passwordRule = {
    scope: "password" as const,
    telegramUserId: ctx.userId,
    telegramChatId: ctx.chatId,
    maxAttempts: 5,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
  };
  const allowed = await assertTelegramRateLimit(passwordRule);

  if (!allowed.ok) {
    await markPendingUsed(pending.id);
    await createUnlockChallenge(ctx, "password_rate_limit");
    return;
  }

  const verified =
    Boolean(serverEnv.telegramAdminPasswordHash) &&
    (await verifyTelegramAdminPassword({
      password: passwordText,
      hash: serverEnv.telegramAdminPasswordHash,
    }));

  if (!verified) {
    await markPendingUsed(pending.id);
    const attempt = await recordTelegramRateLimitAttempt(passwordRule);

    if (attempt.isBlocked) {
      await createUnlockChallenge(ctx, "password_failed_attempts");
      return;
    }

    await sendTelegramMessage({
      chatId: ctx.chatId,
      text: serverEnv.telegramAdminPasswordHash
        ? "❌ Şifrə yanlışdır."
        : "❌ TELEGRAM_ADMIN_PASSWORD_HASH ayarı tamamlanmayıb.",
    });
    return;
  }

  await resetTelegramRateLimit({
    scope: "password",
    telegramUserId: ctx.userId,
    telegramChatId: ctx.chatId,
  });
  await markPendingUsed(pending.id);

  const command = {
    command: pending.command,
    args: pending.command_args ?? "",
  };

  if (COMMANDS[command.command]?.confirm) {
    await createConfirmation(ctx, command);
    return;
  }

  const result = await executeCommand(command, ctx);
  await sendTelegramMessage({ chatId: ctx.chatId, text: await result });
}

async function handleUnlockCodeMessage(message: TelegramMessage, ctx: TelegramContext) {
  const pending = await getPendingUnlockAction(ctx);

  if (!pending) {
    return;
  }

  if (ctx.messageId) {
    void deleteTelegramMessage({ chatId: ctx.chatId, messageId: ctx.messageId });
  }

  const unlockCodeText = typeof message.text === "string" ? message.text.trim() : "";
  const unlockRule = {
    scope: "unlock" as const,
    telegramUserId: ctx.userId,
    telegramChatId: ctx.chatId,
    maxAttempts: 5,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
  };
  const allowed = await assertTelegramRateLimit(unlockRule);

  if (!allowed.ok) {
    await sendTelegramMessage({
      chatId: ctx.chatId,
      text: "🚫 Çox sayda səhv bərpa kodu cəhdi edildi. Bir az sonra yenidən yoxlayın.",
    });
    return;
  }

  const verified =
    Boolean(serverEnv.telegramAdminUnlockCodeHash) &&
    (await verifyTelegramAdminPassword({
      password: unlockCodeText,
      hash: serverEnv.telegramAdminUnlockCodeHash,
    }));

  if (!verified) {
    const attempt = await recordTelegramRateLimitAttempt(unlockRule);
    await sendTelegramMessage({
      chatId: ctx.chatId,
      text: attempt.isBlocked
        ? "🚫 Çox sayda səhv bərpa kodu cəhdi edildi. Bir az sonra yenidən yoxlayın."
        : "❌ Bərpa kodu yanlışdır.",
    });
    return;
  }

  await markPendingUsed(pending.id);
  await resetTelegramAdminAttempts(ctx);
  await sendTelegramMessage({
    chatId: ctx.chatId,
    text: "✅ Cəhdlər sıfırlandı. İndi komandanı yenidən göndərə bilərsiniz.",
  });
}

async function handleMessage(update: TelegramUpdate) {
  const message = update.message;
  const ctx = getMessageContext(message);

  if (!ctx || typeof message?.text !== "string") {
    return;
  }

  await configureCommandMenu();

  if (message.text.trim() === "/cancel") {
    await cancelPendingActions(ctx);
    return;
  }

  const unlockPending = await getPendingUnlockAction(ctx);

  if (unlockPending) {
    const maybeCommand = parseCommand(message.text);

    if (maybeCommand) {
      await sendTelegramMessage({
        chatId: ctx.chatId,
        text: "🔓 Əvvəl bərpa kodunu daxil edin və ya /cancel yazın.",
      });
      return;
    }

    await handleUnlockCodeMessage(message, ctx);
    return;
  }

  const pending = await getPendingPasswordAction(ctx);

  if (pending) {
    const maybeCommand = parseCommand(message.text);

    if (maybeCommand) {
      await sendTelegramMessage({
        chatId: ctx.chatId,
        text: "🔐 Əvvəl gözləyən şifrə yoxlamasını tamamlayın və ya /cancel yazın.",
      });
      return;
    }

    await handlePasswordMessage(message, ctx);
    return;
  }

  const command = parseCommand(message.text);

  if (!command) {
    return;
  }

  if (!(await enforceRateLimit(command.command, ctx))) {
    return;
  }

  await createPasswordChallenge(ctx, command);
}

async function handleCallback(update: TelegramUpdate) {
  const callback = update.callback_query;
  const ctx = getCallbackContext(callback);

  if (!ctx || !callback?.data || !ctx.callbackQueryId) {
    return;
  }

  await configureCommandMenu();

  const match = callback.data.match(/^tgadmin:(confirm|cancel):([a-f0-9]+)$/);

  if (!match) {
    return;
  }

  const [, action, token] = match;
  const pending = await getPendingConfirmation(ctx, token);

  await answerTelegramCallback({ callbackQueryId: ctx.callbackQueryId });

  if (!pending) {
    if (ctx.messageId) {
      await editTelegramMessage({
        chatId: ctx.chatId,
        messageId: ctx.messageId,
        text: "⏱️ Təsdiq vaxtı bitib və ya artıq istifadə olunub.",
      });
    }
    return;
  }

  if (!(await enforceRateLimit(pending.command, ctx))) {
    return;
  }

  await markPendingUsed(pending.id);

  if (action === "cancel") {
    if (ctx.messageId) {
      await editTelegramMessage({
        chatId: ctx.chatId,
        messageId: ctx.messageId,
        text: "✅ Əməliyyat ləğv edildi.",
      });
    }
    return;
  }

  const result = await executeCommand(
    {
      command: pending.command,
      args: pending.command_args ?? "",
    },
    ctx,
  );

  if (ctx.messageId) {
    await editTelegramMessage({
      chatId: ctx.chatId,
      messageId: ctx.messageId,
      text: await result,
    });
  } else {
    await sendTelegramMessage({ chatId: ctx.chatId, text: await result });
  }
}

export async function handleTelegramAdminUpdate(update: unknown) {
  if (!isValidUpdate(update)) {
    return;
  }

  if (update.message) {
    await handleMessage(update);
    return;
  }

  if (update.callback_query) {
    await handleCallback(update);
  }
}

export type OrderMethod = "system" | "whatsapp";

export const DEFAULT_WHATSAPP_ORDER_TEMPLATE = `Salam, sifariş vermək istəyirəm.

Satıcı: {{seller_name}}
Mağaza: {{store_name}}

{{products}}

{{#promo}}
Ara cəm: {{subtotal}}
Promo kod: {{promo_code}}
Endirim: {{discount_percent}}%
Endirim məbləği: {{discount_amount}}
{{/promo}}
Ümumi: {{total}}
Çatdırılma: {{delivery_method}}
Ünvan: {{address}}

Müştəri: {{customer_name}}
Telefon: {{customer_phone}}

Tarix: {{date}} {{time}}`;

export const WHATSAPP_ORDER_PLACEHOLDERS = [
  "order_number",
  "customer_name",
  "customer_phone",
  "seller_name",
  "store_name",
  "product_name",
  "products",
  "quantity",
  "price",
  "total",
  "delivery_method",
  "address",
  "date",
  "time",
  "promo_code",
  "discount_percent",
  "discount_amount",
  "subtotal",
  "total_after_discount",
] as const;

export type WhatsAppOrderPlaceholder = (typeof WHATSAPP_ORDER_PLACEHOLDERS)[number];

export type WhatsAppTemplateValues = Record<WhatsAppOrderPlaceholder, string>;

export function normalizeOrderMethod(value: unknown): OrderMethod {
  return value === "whatsapp" ? "whatsapp" : "system";
}

export function normalizeWhatsAppTemplate(value: unknown) {
  const template = typeof value === "string" ? value.trim() : "";

  return template || DEFAULT_WHATSAPP_ORDER_TEMPLATE;
}

export function toWhatsAppPhone(value: string | null | undefined) {
  let digits = (value ?? "").replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 9) {
    digits = `994${digits}`;
  }

  if (digits.startsWith("994") && digits.length >= 12) {
    return digits;
  }

  return digits.length >= 10 ? digits : "";
}

export function renderWhatsAppOrderTemplate(
  template: string,
  values: WhatsAppTemplateValues,
  conditions: { promo?: boolean } = {},
) {
  const normalizedTemplate = normalizeWhatsAppTemplate(template);
  const withConditionalBlocks = normalizedTemplate.replace(
    /\{\{#promo\}\}([\s\S]*?)\{\{\/promo\}\}/g,
    conditions.promo ? "$1" : "",
  );

  return withConditionalBlocks.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (WHATSAPP_ORDER_PLACEHOLDERS.includes(key as WhatsAppOrderPlaceholder)) {
      return values[key as WhatsAppOrderPlaceholder] || "";
    }

    return match;
  });
}

export function createSampleWhatsAppTemplateValues(): WhatsAppTemplateValues {
  return {
    order_number: "WA-20260831-001",
    customer_name: "Əli Məmmədov",
    customer_phone: "+994 50 123 45 67",
    seller_name: "Apple Store",
    store_name: "Apple Store",
    product_name: "iPhone 17 Pro",
    products: ["1. iPhone 17 Pro", "   2 ədəd × AZN 2499.00", "", "2. Adapter", "   1 ədəd × AZN 49.00"].join("\n"),
    quantity: "3",
    price: "AZN 2499.00",
    total: "AZN 5047.00",
    delivery_method: "Bakı daxili kuryer",
    address: "Bakı, Nəsimi rayonu",
    date: "31.08.2026",
    time: "14:30",
    promo_code: "BUTUN25",
    discount_percent: "25",
    discount_amount: "AZN 1261.75",
    subtotal: "AZN 5047.00",
    total_after_discount: "AZN 3785.25",
  };
}

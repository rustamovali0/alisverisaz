import {renderCampaignLayout} from "./campaign-layout.ts";
import {resolveEmailTheme,fillEmailTemplate,systemTemplateKey,SYSTEM_EMAIL_TEMPLATES,type SystemEmailTemplate} from "./template-catalog.ts";
export type EmailJob = {
  id: string;
  kind: string;
  lock_token: string;
  recipient_id: string | null;
  recipient_role: "customer" | "seller" | "administrator";
  to_address: string;
  payload: Record<string, unknown>;
};
export type EmailMessage = { subject: string; html: string; text: string };
const statusLabels: Record<string, string> = {
  pending: "Yeni",
  confirmed: "Təsdiqləndi",
  processing: "Hazırlanır",
  shipped: "Göndərildi",
  delivered: "Çatdırıldı",
  canceled: "Ləğv edildi",
  cancelled: "Ləğv edildi",
  refunded: "Geri ödəndi",
  paid: "Ödənilib",
  failed: "Uğursuz",
  unpaid: "Ödənilməyib",
  active: "Aktiv",
  suspended: "Dayandırılıb",
  draft: "Qaralama",
};
const escape = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]!),
  );
const clean = (s: unknown) =>
  String(s ?? "").replace(/[\r\n]/g, " ").slice(0, 160);
const money = (n: unknown, currency = "AZN") => {
  const value = Number(n);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("invalid_order_amount");
  }
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "AZN",
  }).format(value);
};
export function renderEmail(
  job: EmailJob,
  origin: string,
  order?: Record<string, any>,
  template?: SystemEmailTemplate,
): EmailMessage {
  const base = new URL(origin);
  if (base.protocol !== "https:" || base.username || base.password) {
    throw new Error("invalid_app_origin");
  }
  const seller = job.payload.audience
    ? job.payload.audience === "seller"
    : job.recipient_role === "seller";
  const dashboard = seller ? "/store/dashboard" : "/dashboard";
  let title = String(job.payload.title || "Yeni bildiriş");
  let body = String(
    job.payload.body ||
      "Hesabınıza daxil olaraq məlumatları yoxlaya bilərsiniz.",
  );
  let path = job.recipient_role==="administrator"?"/radmin/email":dashboard + "/notifications";
  let details = "";
  const lines: string[] = [];
  if (job.kind === "registration_admin") {
    const isSeller = job.payload.requested_role === "seller";
    title = isSeller ? "Yeni satıcı qeydiyyatı" : "Yeni alıcı qeydiyyatı";
    body = [
      "Ad: " + String(job.payload.name || "İstifadəçi"),
      "E-poçt: " + String(job.payload.email || ""),
      "Telefon: " + String(job.payload.phone || ""),
      isSeller ? "Mağaza: " + String(job.payload.store || "") : "",
    ].filter(Boolean).join(". ");
    path = "/radmin/users";
  } else if (job.kind.startsWith("order_")) {
    if (!order) throw new Error("order_unavailable");
    title = job.kind === "order_created"
      ? seller ? "Yeni sifariş yaradıldı" : "Sifarişiniz qəbul edildi"
      : job.kind === "order_payment"
      ? "Sifarişin ödəniş statusu yeniləndi"
      : "Sifariş statusu yeniləndi";
    const number = String(order.order_number || order.id);
    const total = money(order.total_amount, order.currency || "AZN");
    const state = String(
      job.kind === "order_payment"
        ? job.payload.payment_status
        : job.payload.status,
    );
    body = `Sifariş: ${number}. ${statusLabels[state] || state}.`;
    lines.push(
      `Sifariş: ${number}`,
      `Mağaza: ${order.stores?.name || "Mağaza"}`,
    );
    const items = Array.isArray(order.order_items)
      ? order.order_items.slice(0, 100)
      : [];
    if (!items.length) throw new Error("order_items_not_ready");
    details =
      '<table role="presentation" width="100%" style="border-collapse:collapse">';
    for (const item of items) {
      const row = `${item.product_name} × ${item.quantity}: ${
        money(item.total_amount, order.currency || "AZN")
      }`;
      lines.push(row);
      details +=
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0">${
          escape(row)
        }</td></tr>`;
    }
    const shipping = money(order.shipping_amount || 0, order.currency || "AZN");
    lines.push(`Çatdırılma: ${shipping}`, `Yekun: ${total}`);
    details += `</table><p>Çatdırılma: ${
      escape(shipping)
    }</p><p><strong>Yekun: ${escape(total)}</strong></p>`;
    // A WhatsApp intent is not a confirmed payment or completed WhatsApp message.
    if (order.metadata?.source === "whatsapp") {
      body += " Bu, WhatsApp sifariş müraciətidir; ödəniş təsdiqi deyil.";
    }
    path = job.recipient_id ? dashboard + "/orders" : "/help";
  } else if(job.kind==='campaign_marketing') {
    path='/products';
  } else if(job.kind==='seller_campaign') {
    if(typeof job.payload.store_slug!=='string'||!job.payload.store_slug)throw Error('seller_store_unavailable');
    path='/store/'+encodeURIComponent(job.payload.store_slug);
    body='Mağaza: '+String(job.payload.store_name||'Mağaza')+'\n\n'+body;
  } else if (job.kind === "welcome") {
    title = "ALİSVERİS.AZ-a xoş gəldiniz";
    body = `${job.payload.name || "Salam"}, hesabınız yaradıldı.`;
    path = dashboard;
  } else if (job.kind.startsWith("message")) path = dashboard + "/messages";
  else if (job.kind === "review") {
    path = seller ? "/store/dashboard/products" : "/dashboard/notifications";
  } else if (job.kind === "stock_low") {
    path = dashboard + "/products";
    body += ` — qalan stok: ${job.payload.stock}`;
  } else if (job.kind === "store_status") {
    path = "/store/dashboard";
    body += ` — ${
      statusLabels[String(job.payload.status)] || job.payload.status
    }`;
  } else if (job.kind === "seller_approved") {
    title = "Satıcı hesabınız təsdiqləndi";
    body = "Mağaza panelindən məhsullarınızı idarə edə bilərsiniz.";
    path = "/store/dashboard";
  }
  const originalTitle=title,originalBody=body;
  const selectedTemplate=template || SYSTEM_EMAIL_TEMPLATES.find(t=>t.key===systemTemplateKey(job));
  const colors=resolveEmailTheme(selectedTemplate?.theme);
  let buttonLabel='Hesabda bax';
  if(selectedTemplate) {
    const state=String(job.kind==='order_payment'?job.payload.payment_status:job.payload.status||'');
    const variables:Record<string,unknown>={ad:job.payload.name||'İstifadəçi',email:job.payload.email||job.to_address,telefon:job.payload.phone||'',magaza:job.payload.store||job.payload.store_name||order?.stores?.name||job.payload.body||'',sifaris:order?.order_number||order?.id||'',status:statusLabels[state]||state,yekun:order?money(order.total_amount,order.currency||'AZN'):'',mehsul:job.payload.body||'',stok:job.payload.stock||'0',basliq:originalTitle,mesaj:originalBody};
    title=fillEmailTemplate(selectedTemplate.title,variables);body=fillEmailTemplate(selectedTemplate.body,variables);buttonLabel=fillEmailTemplate(selectedTemplate.button_label,variables);
    if(order?.metadata?.source==='whatsapp')body+=' Bu, WhatsApp sifariş müraciətidir; ödəniş təsdiqi deyil.';
  }
  if(job.kind==='campaign_marketing'&&buttonLabel==='Hesabda bax')buttonLabel='Təkliflərə bax';
  const link = new URL(path, base).toString();
  const settings = new URL(job.recipient_role==="administrator"?"/radmin/email":dashboard + "/settings", base).toString();
  return {
    subject: clean(title) +
      (order ? ` — ${clean(order.order_number || order.id)}` : ""),
    text: [
      title,
      body,
      ...lines,
      "Hesabda bax: " + link,
      "E-poçt ayarları: " + settings,
    ].join("\n\n"),
    html: (job.kind==='campaign_marketing'||job.kind==='seller_campaign') ? renderCampaignLayout({title,body,link,settings,origin,button:buttonLabel,colors}) :
      `<!doctype html><html lang="az"><body style="margin:0;background:${colors.background};font-family:Arial,sans-serif;color:${colors.text}"><div style="max-width:600px;margin:24px auto;background:${colors.card};padding:28px;border-radius:16px;overflow-wrap:anywhere"><p style="font-weight:bold;color:${colors.heading}">ALİSVERİS.AZ</p><h1 style="font-size:24px;color:${colors.heading}">${
        escape(title)
      }</h1><p style="line-height:1.7;white-space:pre-line">${
        escape(body)
      }</p>${details}<p><a href="${
        escape(link)
      }" style="display:inline-block;padding:14px 22px;background:${colors.button};color:${colors.button_text};text-decoration:none;border-radius:8px">${escape(buttonLabel)}</a></p><p style="font-size:13px;color:#52645c">Şifrənizi və təsdiq kodlarınızı heç kimlə paylaşmayın.</p><a href="${
        escape(settings)
      }" style="font-size:13px;color:#17634b">E-poçt bildirişlərini idarə et</a></div></body></html>`,
  };
}

export type EmailWorkerDependencies = {
  enabled: boolean;
  secret: string;
  configured: boolean;
  origin: string;
  claim(): Promise<EmailJob[]>;
  prepare(
    job: EmailJob,
  ): Promise<{ allowed: boolean; order?: Record<string, any> }>;
  template?(job: EmailJob): Promise<SystemEmailTemplate | undefined>;
  send(job: EmailJob, message: EmailMessage): Promise<string>;
  finish(
    job: EmailJob,
    result: "sent" | "retry" | "failed" | "skipped",
    code?: string,
    messageId?: string,
  ): Promise<void>;
};
async function equalSecrets(a: string, b: string) {
  const digest = async (s: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    );
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
export async function handleEmailDispatch(
  request: Request,
  d: EmailWorkerDependencies,
): Promise<Response> {
  const reply = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: { "cache-control": "no-store" } });
  if (request.method !== "POST") {
    return reply({ error: "method_not_allowed" }, 405);
  }
  if (
    d.secret.length < 32 ||
    !request.headers.get("authorization")?.startsWith("Bearer ") ||
    !await equalSecrets(
      request.headers.get("x-email-dispatch-secret") || "",
      d.secret,
    )
  ) return reply({ error: "unauthorized" }, 401);
  if (!d.enabled || !d.configured) {
    return reply({ status: "disabled", sent: 0 }, 503);
  }
  let jobs: EmailJob[];
  try {
    jobs = await d.claim();
  } catch {
    return reply({ error: "queue_unavailable" }, 503);
  }
  const results = await Promise.all(jobs.map(async (job) => {
    let sent = false;
    try {
      const context = await d.prepare(job);
      if (!context.allowed) {
        await d.finish(job, "skipped", "preferences_or_disabled");
        return "skipped";
      }
      const template=d.template?await d.template(job):undefined;
      const message = renderEmail(job, d.origin, context.order,template);
      const messageId = await d.send(job, message);
      sent = true;
      await d.finish(job, "sent", undefined, messageId);
      return "sent";
    } catch (error) {
      // Never persist provider response strings, credentials, email addresses or recovery tokens.
      const code = sent
        ? "acknowledgement_failed"
        : error instanceof Error && error.message === "order_items_not_ready"
        ? "order_items_not_ready"
        : "delivery_failed";
      try {
        await d.finish(job, "retry", code);
      } catch { /* lease expiry makes the job retryable */ }
      return "retry";
    }
  }));
  return reply({
    processed: results.length,
    sent: results.filter((r) => r === "sent").length,
    retry: results.filter((r) => r === "retry").length,
    skipped: results.filter((r) => r === "skipped").length,
  });
}

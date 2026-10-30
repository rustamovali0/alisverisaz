import {systemTemplateKey,validateSystemTemplate,type SystemEmailTemplate} from "./template-catalog.ts";
import { type EmailWorkerDependencies, handleEmailDispatch } from "./email.ts";

export function createEmailDispatcher(
  env: (key: string) => string,
  makeClient: (url: string, key: string, options: any) => any,
  makeTransport: (options: any) => any,
) {
  const port = Number(env("SMTP_PORT"));
  const from = env("SMTP_FROM");
  const configured = Boolean(
    env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASSWORD") &&
      /^([^<>\r\n]*<)?[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>?$/.test(from) &&
      [465, 587, 2525, 2587].includes(port) && env("APP_ORIGIN") &&
      env("SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"),
  );
  let client: any | undefined;
  const db = () =>
    client ??= makeClient(
      env("SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  const dependencies: EmailWorkerDependencies = {
    enabled: env("EMAIL_DELIVERY_ENABLED") === "true",
    secret: env("EMAIL_DISPATCH_SECRET"),
    configured,
    origin: env("APP_ORIGIN"),
    async claim() {
      const { data, error } = await db().rpc("email_claim_jobs", {
        p_limit: 5,
      });
      if (error) throw Error("claim_failed");
      return data || [];
    },
    async prepare(job) {
      const { data: settings, error: settingsError } = await db().from(
        "email_delivery_settings",
      ).select("enabled,admin_address").eq("id", true).single();
      if (settingsError) throw Error("settings_unavailable");
      if (!settings?.enabled) return { allowed: false };
      if (job.recipient_role === "administrator") {
        return {
          allowed: ["registration_admin", "delivery_test"].includes(job.kind) &&
            settings.admin_address?.toLowerCase() ===
              job.to_address.toLowerCase(),
        };
      }
      if (job.recipient_id) {
        const [
          { data: profile, error: profileError },
          { data: preference, error: preferenceError },
        ] = await Promise.all([
          db().from("profiles").select("email,role").eq("id", job.recipient_id)
            .maybeSingle(),
          db().from("email_preferences").select("transactional,marketing").eq(
            "user_id",
            job.recipient_id,
          ).maybeSingle(),
        ]);
        if (profileError || preferenceError) {
          throw Error("recipient_unavailable");
        }
        if (
          !profile || !["customer", "seller"].includes(profile.role) ||
          profile.email?.toLowerCase() !== job.to_address.toLowerCase()
        ) return { allowed: false };
        if (
          (job.kind === "promo" || job.kind === "campaign_marketing" || job.kind === "seller_campaign")
            ? !preference?.marketing
            : preference?.transactional === false
        ) return { allowed: false };
      }
      if(job.kind==='seller_campaign') {
        const {data:stores,error}=await db().rpc('email_seller_eligible_stores',{p_actor:job.payload.sender_id});
        if(error)throw Error('seller_permission_lookup_failed');
        const store=stores?.find((s:any)=>s.id===job.payload.sender_store_id);if(!store)return {allowed:false};
        job.payload.store_slug=store.slug;job.payload.store_name=store.name;job.payload.title=store.name+' — '+String(job.payload.campaign_subject||'');
      }
      if (!job.kind.startsWith("order_")) return { allowed: true };
      const [{ data: site, error: siteError }, { data: order, error }] =
        await Promise.all([
          db().from("platform_settings").select("value").eq("key", "site")
            .maybeSingle(),
          db().from("orders").select(
            "id,order_number,user_id,total_amount,shipping_amount,currency,metadata,customers(email),stores(owner_id,name),order_items(product_name,quantity,total_amount)",
          ).eq("id", job.payload.order_id).maybeSingle(),
        ]);
      if (error || siteError) throw Error("order_lookup_failed");
      if (site?.value?.order_email_notifications_enabled === false || !order) {
        return { allowed: false };
      }
      const relation = (row: any) => Array.isArray(row) ? row[0] : row;
      const store = relation(order.stores);
      const customer = relation(order.customers);
      const owns = job.payload.audience === "seller"
        ? store?.owner_id === job.recipient_id
        : job.recipient_id
        ? order.user_id === job.recipient_id
        : customer?.email?.toLowerCase() === job.to_address.toLowerCase();
      return { allowed: Boolean(owns), order: { ...order, stores: store } };
    },
    async template(job) {
      const key=systemTemplateKey(job);if(!key)return undefined;
      const {data,error}=await db().from('email_system_templates').select('key,name,title,body,button_label,theme').eq('key',key).maybeSingle();
      if(error)throw Error('system_template_unavailable');
      if(!data)return undefined;
      if(!validateSystemTemplate(data as SystemEmailTemplate))throw Error('invalid_system_template');
      return data as SystemEmailTemplate;
    },
    async send(job, message) {
      const transport = makeTransport({
        host: env("SMTP_HOST"),
        port,
        secure: port === 465,
        requireTLS: port !== 465,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        auth: {
          user: env("SMTP_USER"),
          pass: env("SMTP_PASSWORD"),
        },
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      try {
        const domain = from.replace(/^.*@/, "").replace(/>$/, "");
        const result = await transport.sendMail({
          from,
          to: job.to_address,
          ...message,
          messageId: `<${job.id}@${domain}>`,
        });
        if (!result.accepted?.length) throw Error("recipient_rejected");
        return result.messageId;
      } finally {
        transport.close();
      }
    },
    async finish(job, result, code, messageId) {
      const { data, error } = await db().rpc("email_finish_job", {
        p_id: job.id,
        p_token: job.lock_token,
        p_result: result,
        p_code: code || null,
        p_message_id: messageId || null,
      });
      if (error || data !== true) throw Error("ack_failed");
    },
  };
  return (request: Request) => handleEmailDispatch(request, dependencies);
}

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireRadmin } from "@/lib/auth/radmin-auth";
import { recordAdminAudit } from "@/lib/admin/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { SYSTEM_EMAIL_TEMPLATES,validateSystemTemplate,type SystemEmailTemplate } from "../../../supabase/functions/_shared/template-catalog";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const read = (f: FormData, k: string) => String(f.get(k) || "").trim();
function draft(f: FormData) {
  const subject = read(f, "subject"),
    body = read(f, "body"),
    audience = read(f, "audience"),
    purpose = read(f, "purpose");
  const selected = Array.from(new Set(f.getAll("recipient").map(String)));
  if (
    !subject || subject.length > 160 || /[\r\n]/.test(subject) || !body ||
    body.length > 20000 ||
    !["customer", "seller", "all", "selected"].includes(audience) ||
    !["service", "marketing"].includes(purpose) ||
    selected.length > 1000 || selected.some((id) => !uuid.test(id)) ||
    (audience === "selected" && !selected.length)
  ) return null;
  return { subject, body, audience, purpose, selected };
}
export async function loadEmailCenter() {
  await requireRadmin();
  const db = createSupabaseAdminClient() as any;
  const [settings, templates, history, system] = await Promise.all([
    db.from("email_delivery_settings").select("enabled,admin_address").eq(
      "id",
      true,
    ).single(),
    db.from("email_templates").select("id,name,subject,body,purpose").order(
      "updated_at",
      { ascending: false },
    ).limit(50),
    db.rpc("email_campaign_history", { p_limit: 20 }),
    db.from("email_system_templates").select("key,name,title,body,button_label").order("name").limit(30),
  ]);
  return {
    available: !settings.error && !templates.error && !history.error,
    enabled: settings.data?.enabled === true,
    adminAddress: settings.data?.admin_address || "admin@alisveris.az",
    templates: templates.data || [],
    history: history.data || [],
    systemAvailable: !system.error,
    systemTemplates: system.data || SYSTEM_EMAIL_TEMPLATES,
  };
}
export async function searchEmailRecipients(term: string) {
  await requireRadmin();
  if (typeof term !== "string" || term.trim().length < 2 || term.length > 254) {
    return [];
  }
  const db = createSupabaseAdminClient() as any;
  const { data } = await db.from("profiles").select("id,full_name,email,role")
    .in("role", ["customer", "seller"])
    .ilike("email", term.trim().replace(/[%_\\]/g, "\\$&") + "%").order("email")
    .limit(25);
  return data || [];
}
export async function previewAdminEmail(f: FormData) {
  const current = await requireRadmin();
  const value = draft(f);
  if (!value) {
    return { ok: false, message: "Mövzu, mətn və alıcı seçimini yoxlayın." };
  }
  const db = createSupabaseAdminClient() as any;
  const { data, error } = await db.rpc("email_preview_campaign", {
    p_actor: current.user.id,
    p_audience: value.audience,
    p_selected: value.selected,
    p_purpose: value.purpose,
  });
  return error
    ? {
      ok: false,
      message: "Alıcı sayı yoxlanılmadı. E-poçt quruluşunu yoxlayın.",
    }
    : { ok: true, count: Number(data) };
}
export async function queueAdminEmail(f: FormData) {
  const current = await requireRadmin();
  const value = draft(f);
  const request = read(f, "requestId");
  if (!value || !uuid.test(request)) {
    return { ok: false, message: "Göndəriş məlumatlarını yoxlayın." };
  }
  const db = createSupabaseAdminClient() as any;
  const { data, error } = await db.rpc("email_queue_campaign", {
    p_actor: current.user.id,
    p_request: request,
    p_audience: value.audience,
    p_selected: value.selected,
    p_subject: value.subject,
    p_body: value.body,
    p_purpose: value.purpose,
  });
  if (error) {
    return {
      ok: false,
      message: String(error.message).includes("EMAIL_DELIVERY_DISABLED")
        ? "E-poçt göndərişi hələ aktiv deyil."
        : String(error.message).includes("EMAIL_REQUEST_CONFLICT")
        ? "Bu sorğu artıq başqa məzmunla yaradılıb. Göndəriş tarixçəsini yoxlayın."
        : "Göndəriş nəticəsi təsdiqlənmədi. Eyni sorğunu təkrar yoxlayın.",
    };
  }
  await recordAdminAudit({
    adminId: current.user.id,
    action: "email_campaign_queued",
    entityType: "email_campaigns",
    entityId: data.id,
    metadata: {
      audience: value.audience,
      purpose: value.purpose,
      recipient_count: data.count,
    },
  });
  revalidatePath("/radmin/email");
  return {
    ok: true,
    message: `${data.count} e-poçt göndəriş növbəsinə əlavə edildi.`,
    id: data.id,
  };
}
export async function saveEmailTemplate(f: FormData) {
  const current = await requireRadmin();
  const name = read(f, "name"),
    subject = read(f, "subject"),
    body = read(f, "body"),
    purpose = read(f, "purpose"),
    id = read(f, "id");
  if (
    !name || name.length > 120 || !subject || subject.length > 160 ||
    /[\r\n]/.test(subject) || !body || body.length > 20000 ||
    !["service", "marketing"].includes(purpose) || (id && !uuid.test(id))
  ) {
    return {
      ok: false,
      message: "Şablonun adını, mövzusunu və mətnini yoxlayın.",
    };
  }
  const db = createSupabaseAdminClient() as any;
  const { error } = await db.from("email_templates").upsert({
    ...id ? { id } : {},
    name,
    subject,
    body,
    purpose,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: "Şablon saxlanılmadı." };
  await recordAdminAudit({
    adminId: current.user.id,
    action: "email_template_saved",
    entityType: "email_templates",
    entityId: id || null,
    metadata: { name },
  });
  revalidatePath("/radmin/email");
  return { ok: true, message: "Şablon saxlanıldı." };
}
export async function loadEmailCampaignRecipients(id: string, page = 0) {
  await requireRadmin();
  if (!uuid.test(id) || !Number.isInteger(page) || page < 0 || page > 10000) {
    return [];
  }
  const db = createSupabaseAdminClient() as any;
  const { data } = await db.from("email_outbox").select(
    "id,to_address,status,attempt_count,last_error_code",
  )
    .eq("campaign_id", id).order("id").range(page * 50, page * 50 + 49);
  return data || [];
}

export async function saveSystemEmailTemplate(f:FormData) {
 const current=await requireRadmin();
 const key=read(f,'key'),defaults=SYSTEM_EMAIL_TEMPLATES.find(t=>t.key===key);
 const value:SystemEmailTemplate={key,name:defaults?.name||'',title:read(f,'title'),body:read(f,'body'),button_label:read(f,'button_label')};
 if(!validateSystemTemplate(value))return {ok:false,message:'Başlığı, mətni və icazəli dəyişənləri yoxlayın.'};
 const db=createSupabaseAdminClient() as any;
 const {error}=await db.from('email_system_templates').update({title:value.title,body:value.body,button_label:value.button_label,updated_at:new Date().toISOString()}).eq('key',key).select('key').single();
 if(error)return {ok:false,message:'Sistem şablonu saxlanılmadı.'};
 await recordAdminAudit({adminId:current.user.id,action:'system_email_template_saved',entityType:'email_system_templates',entityId:null,metadata:{key}});
 revalidateTag('system-email-templates',{expire:0});revalidatePath('/radmin/email');
 return {ok:true,message:key==='password_recovery'?'Şablon saxlanıldı. Şifrə bərpası məktublarında yenilənməsi 10 dəqiqəyədək çəkə bilər.':'Şablon saxlanıldı. Növbəti məktublarda istifadə ediləcək.'};
}

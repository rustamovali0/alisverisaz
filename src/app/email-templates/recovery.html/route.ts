import { unstable_cache } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { renderRecoveryTemplate } from '@/lib/email/recovery-template';
import { SYSTEM_EMAIL_TEMPLATES,validateSystemTemplate,type SystemEmailTemplate } from '../../../../supabase/functions/_shared/template-catalog';
const template=unstable_cache(async()=>{
 try {const db=createSupabaseAdminClient() as any;const {data,error}=await db.from('email_system_templates').select('key,name,title,body,button_label').eq('key','password_recovery').maybeSingle();if(!error&&data&&validateSystemTemplate(data as SystemEmailTemplate))return data as SystemEmailTemplate;}catch{}
 return SYSTEM_EMAIL_TEMPLATES[0];
},['auth-recovery-email-template'],{revalidate:60,tags:['system-email-templates']});
export async function GET() {
 return new Response(renderRecoveryTemplate(await template()),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
}

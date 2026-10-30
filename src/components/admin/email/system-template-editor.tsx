"use client";
import { useMemo,useState,useTransition } from 'react';
import { Eye,Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveSystemEmailTemplate } from '@/lib/email/admin';
import { renderRecoveryTemplate } from '@/lib/email/recovery-template';
import { renderEmail,type EmailJob } from '../../../../supabase/functions/_shared/email';
import { EMAIL_THEME_DEFAULTS,resolveEmailTheme,SYSTEM_EMAIL_TEMPLATES,SYSTEM_TEMPLATE_VARIABLES,SYSTEM_TEMPLATE_PREVIEW_VARIABLES,type SystemEmailTemplate } from '../../../../supabase/functions/_shared/template-catalog';
const field='min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
export function SystemTemplateEditor({initialTemplates,available}:{initialTemplates:SystemEmailTemplate[];available:boolean}) {
 const [templates,setTemplates]=useState(initialTemplates.length?initialTemplates:SYSTEM_EMAIL_TEMPLATES);
 const [draft,setDraft]=useState<SystemEmailTemplate>(()=>(initialTemplates.find(t=>t.key==='password_recovery')||SYSTEM_EMAIL_TEMPLATES[0]));
 const [pending,start]=useTransition(),[feedback,setFeedback]=useState('');
 const preview=useMemo(()=>{
  if(draft.key==='password_recovery')return renderRecoveryTemplate(draft).replaceAll('{{ .Email }}',SYSTEM_TEMPLATE_PREVIEW_VARIABLES.email).replaceAll('{{ .SiteURL }}','https://alisveris.az').replaceAll('{{ .TokenHash }}','preview-only');
  const audience=draft.key.endsWith('_seller')?'seller':'customer';
  const kind=draft.key.startsWith('registration_')?'registration_admin':draft.key.startsWith('order_')?draft.key.replace(/_(seller|customer)$/,''):draft.key;
  const job:EmailJob={id:'preview',kind,lock_token:'',recipient_id:'preview',recipient_role:draft.key.startsWith('registration_')?'administrator':audience,to_address:'alici@example.com',payload:{title:'Yeni bildiriş',body:'Nümunə məhsul',name:'Aysel',email:'alici@example.com',phone:'+994 50 000 00 00',store:'Nümunə mağaza',requested_role:draft.key==='registration_seller_admin'?'seller':'customer',audience,status:'confirmed',payment_status:'paid',stock:3,store_slug:'numune-magaza',store_name:'Nümunə mağaza'}};
  const order=kind.startsWith('order_')?{id:'TEST-1001',order_number:'TEST-1001',stores:{name:'Nümunə mağaza'},total_amount:120,shipping_amount:0,currency:'AZN',order_items:[{product_name:'Nümunə məhsul',quantity:2,total_amount:120}]}:undefined;
  return renderEmail(job,'https://alisveris.az',order,draft).html;
 },[draft]);
 function save(){start(async()=>{try{const f=new FormData();for(const key of ['key','title','body','button_label'] as const)f.set(key,draft[key]);for(const [key,value] of Object.entries(resolveEmailTheme(draft.theme)))f.set('color_'+key,value);const r=await saveSystemEmailTemplate(f);setFeedback(r.message);if(r.ok)setTemplates(old=>old.map(t=>t.key===draft.key?draft:t));}catch{setFeedback('Şablon saxlanılmadı. Bağlantını yoxlayın.')}})}
 return <section className="space-y-4">
  <div className="rounded-xl border bg-card p-4"><h2 className="text-xl font-bold">Avtomatik məktubların şablonları</h2><p className="mt-2 text-sm text-muted-foreground">Redaktə edin və sağdakı görünüşdən yoxlayın. Nümunə məlumatlar göstərilir; bu ekran məktub göndərmir.</p></div>
  {!available&&<p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-950">Sistem şablonları üçün verilənlər bazası yenilənməlidir.</p>}
  <div className="grid items-start gap-5 xl:grid-cols-2">
   <fieldset disabled={pending||!available} className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-6">
    <label className="grid gap-2 text-sm font-semibold">Şablon<select className={field} value={draft.key} onChange={e=>{setDraft(templates.find(t=>t.key===e.target.value)||SYSTEM_EMAIL_TEMPLATES[0]);setFeedback('')}}>{SYSTEM_EMAIL_TEMPLATES.map(t=><option key={t.key} value={t.key}>{t.name}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-semibold">{draft.key==='password_recovery'?'Məktub daxilində başlıq':'Mövzu və başlıq'}<input className={field} value={draft.title} maxLength={160} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
    <label className="grid gap-2 text-sm font-semibold">Mətn<textarea className={field+' min-h-56 resize-y'} value={draft.body} maxLength={20000} onChange={e=>setDraft({...draft,body:e.target.value})}/></label>
    <label className="grid gap-2 text-sm font-semibold">Düymənin yazısı<input className={field} value={draft.button_label} maxLength={80} onChange={e=>setDraft({...draft,button_label:e.target.value})}/></label>
    <p className="break-words text-sm text-muted-foreground">İcazəli dəyişənlər: {SYSTEM_TEMPLATE_VARIABLES[draft.key]?.map(v=>`{${v}}`).join(', ')||'Bu şablonda dəyişən yoxdur.'}</p>
    {draft.key==='password_recovery'&&<p className="text-sm text-muted-foreground">Poçt qutusunda mövzu “ALİSVERİS.AZ — şifrə bərpası” olaraq qalır. Başlıq, mətn və düymə redaktə olunur; bərpa linki sistem tərəfindən qorunur.</p>}
    {draft.key.startsWith('order_')&&<p className="text-sm text-muted-foreground">Məhsullar, qiymətlər və sifariş xülasəsi avtomatik əlavə edilir.</p>}
    <div className="grid grid-cols-2 gap-3">{Object.entries(EMAIL_THEME_DEFAULTS).map(([key])=><label key={key} className="grid gap-2 text-sm font-semibold">{({background:'Fon',card:'Kartın fonu',text:'Mətn',heading:'Başlıq',button:'Düymə',button_text:'Düymə yazısı'} as Record<string,string>)[key]}<div className="flex min-h-11 items-center gap-2 rounded-lg border px-2"><input type="color" aria-label={({background:'Fon rəngi',card:'Kartın fon rəngi',text:'Mətn rəngi',heading:'Başlıq rəngi',button:'Düymə rəngi',button_text:'Düymə yazısının rəngi'} as Record<string,string>)[key]} value={resolveEmailTheme(draft.theme)[key as keyof typeof EMAIL_THEME_DEFAULTS]} onChange={e=>setDraft({...draft,theme:{...resolveEmailTheme(draft.theme),[key]:e.target.value}})} className="h-11 w-12 cursor-pointer rounded"/><span className="text-xs font-normal">{resolveEmailTheme(draft.theme)[key as keyof typeof EMAIL_THEME_DEFAULTS]}</span></div></label>)}</div>
    <Button type="button" onClick={save} disabled={pending||!available} className="min-h-11"><Save className="mr-2 size-4"/>{pending?'Saxlanılır…':'Şablonu saxla'}</Button>
    <p role="status" aria-live="polite" className="text-sm">{feedback}</p>
   </fieldset>
   <aside className="min-w-0 overflow-hidden rounded-xl border bg-card xl:sticky xl:top-24"><div className="flex items-center gap-2 border-b p-4 font-semibold"><Eye className="size-5"/>Şablonun görünüşü <span className="ml-auto text-xs text-muted-foreground">Nümunə</span></div><iframe title="Şablonun canlı önizləməsi" sandbox="" srcDoc={preview} className="h-[480px] sm:h-[650px] w-full border-0 bg-[#f4f7f4]"/></aside>
  </div>
 </section>;
}

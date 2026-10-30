"use client";
import { useMemo,useRef,useState,useTransition } from 'react';
import { Mail,Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appAlert } from '@/lib/alerts/app-alert';
import {loadSellerEmailCenter,previewSellerEmail,queueSellerEmail} from '@/lib/email/seller';
import {renderEmail} from '../../../../supabase/functions/_shared/email';
type Store={id:string;name:string;slug:string};type History={id:string;subject:string;recipient_count:number;sent:number;pending:number;failed:number;skipped:number;created_at:string};
const field='min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
export function SellerEmailCenter({initial}:{initial:{stores:Store[];enabled:boolean;history:History[]}}){
 const [data,setData]=useState(initial),[storeId,setStoreId]=useState(initial.stores[0]?.id||''),[subject,setSubject]=useState('Yeni endirimlər və məhsullar'),[body,setBody]=useState('Yeni məhsullarımızı və davam edən endirimlərimizi kəşf edin. Sizə uyğun seçimlər üçün mağazamıza baxın.'),[feedback,setFeedback]=useState(''),[pending,start]=useTransition();
 const request=useRef<string|null>(null),store=data.stores.find(s=>s.id===storeId);
 const html=useMemo(()=>renderEmail({id:'preview',kind:'seller_campaign',lock_token:'',recipient_id:'preview',recipient_role:'customer',to_address:'alici@example.com',payload:{title:(store?.name||'Mağaza')+' — '+subject,body,store_name:store?.name||'Mağaza',store_slug:store?.slug||'numune'}},'https://alisveris.az').html,[store,subject,body]);
 function form(){const f=new FormData();f.set('storeId',storeId);f.set('subject',subject);f.set('body',body);return f}
 function send(){start(async()=>{setFeedback('');try{const f=form(),preview=await previewSellerEmail(f);if(!preview.ok){setFeedback(preview.message||'Alıcı sayı yoxlanılmadı.');return}if(!preview.count){setFeedback('Hazırda reklam məktublarını qəbul edən uyğun istifadəçi yoxdur.');return}
 const confirm=await appAlert.confirm({title:'Kampaniya göndərilsin?',message:`${store?.name}: ${preview.count} istifadəçiyə e-poçt göndəriləcək. Mövzu: ${subject}`,confirmText:'Göndər',variant:'default'});if(!confirm.isConfirmed)return;
 request.current??=crypto.randomUUID();f.set('requestId',request.current);const r=await queueSellerEmail(f);setFeedback(r.message);if(r.ok){request.current=null;setData(await loadSellerEmailCenter())}
 }catch{setFeedback('Göndəriş cavabı alınmadı. Əvvəl tarixçəyə baxın; təkrar eyni sorğunu yoxlayacaq.')}})}
 if(!data.stores.length)return <p className="rounded-xl border bg-card p-5">E-poçt kampaniyası icazəsi aktiv deyil.</p>;
 return <div className="space-y-6"><div className="rounded-xl border bg-card p-4 text-sm leading-6"><p className="flex items-center gap-2 font-semibold"><Mail className="size-5"/>Mağazanızın yeniliklərini paylaşın</p><p className="mt-2">Məktub reklam e-poçtlarını qəbul edən istifadəçilərə göndərilir. 24 saat ərzində bir kampaniya göndərə bilərsiniz. Məktubda mağazanızın adı və vitrininə keçid avtomatik əlavə olunur.</p>{!data.enabled&&<p role="alert">E-poçt göndərişi hazırda bağlıdır.</p>}</div>
 <div className="grid items-start gap-5 xl:grid-cols-2"><fieldset disabled={pending||!data.enabled} className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-6">
 <label className="grid gap-2 text-sm font-semibold">Mağaza<select className={field} value={storeId} onChange={e=>setStoreId(e.target.value)}>{data.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label className="grid gap-2 text-sm font-semibold">Mövzu<input className={field} value={subject} maxLength={160} onChange={e=>setSubject(e.target.value)}/></label>
 <label className="grid gap-2 text-sm font-semibold">Mətn<textarea className={field+' min-h-56 resize-y'} value={body} maxLength={5000} onChange={e=>setBody(e.target.value)}/></label><p className="text-right text-xs text-muted-foreground">{body.length}/5000</p>
 <Button type="button" onClick={send} disabled={pending||!data.enabled||!subject.trim()||!body.trim()} className="min-h-11"><Send className="mr-2 size-4"/>{pending?'Yoxlanılır…':'Yoxla və göndər'}</Button><p role="status" aria-live="polite" className="text-sm">{feedback}</p>
 </fieldset><aside className="min-w-0 overflow-hidden rounded-xl border bg-card xl:sticky xl:top-28"><h2 className="border-b p-4 font-semibold">Məktubun görünüşü</h2><iframe title="Kampaniya məktubunun önizləməsi" sandbox="" srcDoc={html} className="h-[460px] sm:h-[600px] w-full border-0"/></aside></div>
 <section className="space-y-3"><h2 className="text-xl font-bold">Göndəriş tarixçəsi</h2>{!data.history.length&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Hələ kampaniya göndərməmisiniz.</p>}{data.history.map(c=><article key={c.id} className="space-y-2 rounded-xl border bg-card p-4"><h3 className="break-words font-semibold">{c.subject}</h3><p className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleString('az-AZ',{timeZone:'Asia/Baku'})}</p><div className="flex flex-wrap gap-4 text-sm"><span>Alıcı: {c.recipient_count}</span><span>Göndərilib: {c.sent}</span><span>Gözləyir: {c.pending}</span><span>Uğursuz: {c.failed}</span><span>Dayandırılıb: {c.skipped}</span></div></article>)}</section></div>
}

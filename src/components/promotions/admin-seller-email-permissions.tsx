"use client";
import { useState,useTransition } from 'react';
import { Mail,Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setSellerEmailPermission } from '@/lib/email/seller';
type Store={id:string;name:string;promoted:boolean;enabled:boolean};
function PermissionRow({store,available}:{store:Store;available:boolean}){
 const [enabled,setEnabled]=useState(store.enabled),[pending,start]=useTransition(),[message,setMessage]=useState('');
 const save=()=>start(async()=>{try{const f=new FormData();f.set('storeId',store.id);f.set('enabled',String(enabled));const r=await setSellerEmailPermission(f);setMessage(r.message)}catch{setMessage('İcazə saxlanılmadı. Bağlantını yoxlayın.')}});
 return <div className="grid min-w-0 gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div className="min-w-0"><h3 className="break-words font-bold">{store.name}</h3><p className="mt-1 text-sm text-muted-foreground">{store.promoted?'Önə çıxarma aktivdir':'Önə çıxarma aktiv deyil; kampaniya satıcıda görünməyəcək.'}</p></div><label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium"><input type="checkbox" className="size-5 accent-primary" checked={enabled} disabled={pending||!available} onChange={e=>setEnabled(e.target.checked)}/>E-poçt kampaniyası</label><Button type="button" onClick={save} disabled={pending||!available} className="min-h-11"><Save className="mr-2 size-4"/>{pending?'Saxlanılır…':'Saxla'}</Button><p role="status" className="text-sm sm:col-span-3">{message}</p></div>
}
export function AdminSellerEmailPermissions({stores,available}:{stores:Store[];available:boolean}){
 return <section className="mt-6 space-y-4 rounded-xl border bg-card p-4 sm:p-6"><h2 className="flex items-center gap-2 text-xl font-bold"><Mail className="size-6"/>Satıcı e-poçt kampaniyaları</h2><p className="text-sm text-muted-foreground">İcazə aktiv olduqda və mağaza önə çıxarıldıqda satıcının panelində “E-poçt kampaniyaları” görünür. Satıcı reklam məktublarını qəbul edən istifadəçilərə 24 saatda bir kampaniya göndərə bilər. İcazəni söndürmək növbədəki göndərilməmiş kampaniyaları da dayandırır.</p>{!available&&<p role="alert">Bu bölmə üçün verilənlər bazası yenilənməlidir.</p>}{stores.map(store=><PermissionRow key={store.id} store={store} available={available}/>)}{!stores.length&&<p>Aktiv mağaza yoxdur.</p>}</section>
}

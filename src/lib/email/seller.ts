"use server";
import { revalidatePath } from 'next/cache';
import { requireRadmin } from '@/lib/auth/radmin-auth';
import { requireSeller } from '@/lib/auth/seller-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSellerEmailStores } from '@/lib/email/seller-access';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const read=(f:FormData,key:string)=>String(f.get(key)||'').trim();
export async function loadAdminSellerEmailPermissions(){
 await requireRadmin();const db=createSupabaseAdminClient() as any;const {data,error}=await db.from('seller_email_permissions').select('store_id,enabled');return {available:!error,permissions:data||[]};
}
export async function setSellerEmailPermission(f:FormData){
 const current=await requireRadmin();const storeId=read(f,'storeId'),enabled=read(f,'enabled');
 if(!uuid.test(storeId)||!['true','false'].includes(enabled))return {ok:false,message:'Mağaza və icazə seçimini yoxlayın.'};
 const db=createSupabaseAdminClient() as any;const store=await db.from('stores').select('id').eq('id',storeId).maybeSingle();if(store.error||!store.data)return {ok:false,message:'Mağaza tapılmadı.'};
 const result=await db.from('seller_email_permissions').upsert({store_id:storeId,enabled:enabled==='true',updated_by:current.user.id,updated_at:new Date().toISOString()});if(result.error)return {ok:false,message:'E-poçt icazəsi saxlanılmadı.'};
 await recordAdminAudit({adminId:current.user.id,action:'seller_email_permission_updated',entityType:'stores',entityId:storeId,metadata:{enabled:enabled==='true'}});
 revalidatePath('/radmin/promotions');revalidatePath('/store/dashboard','layout');return {ok:true,message:'E-poçt kampaniyası icazəsi saxlanıldı.'};
}
function values(f:FormData){const store=read(f,'storeId'),subject=read(f,'subject'),body=read(f,'body');return uuid.test(store)&&subject&&subject.length<=160&&!/[\r\n]/.test(subject)&&body&&body.length<=5000?{store,subject,body}:null;}
const errorMessage=(message:string)=>message.includes('EMAIL_SELLER_DAILY_LIMIT')?'24 saat ərzində bir kampaniya göndərə bilərsiniz.':message.includes('EMAIL_SELLER_ACCESS_DENIED')?'Bu mağaza üçün kampaniya icazəsi aktiv deyil.':message.includes('EMAIL_NO_ELIGIBLE_RECIPIENTS')?'Reklam e-poçtunu qəbul edən uyğun istifadəçi yoxdur.':message.includes('EMAIL_DELIVERY_DISABLED')?'E-poçt göndərişi hazırda bağlıdır.':message.includes('EMAIL_REQUEST_CONFLICT')?'Bu sorğu başqa məzmunla işlənib. Tarixçəni yoxlayın.':'Əməliyyat təsdiqlənmədi. Təkrar yoxlayın.';
export async function previewSellerEmail(f:FormData){
 const current=await requireSeller('/store/dashboard/email-campaigns'),value=values(f);if(!value)return {ok:false,message:'Mağaza, mövzu və mətni yoxlayın.'};
 const db=createSupabaseAdminClient() as any;const {data,error}=await db.rpc('email_preview_seller_campaign',{p_actor:current.user.id,p_store:value.store});return error?{ok:false,message:errorMessage(String(error.message))}:{ok:true,count:Number(data)};
}
export async function queueSellerEmail(f:FormData){
 const current=await requireSeller('/store/dashboard/email-campaigns'),value=values(f),request=read(f,'requestId');if(!value||!uuid.test(request))return {ok:false,message:'Göndəriş məlumatlarını yoxlayın.'};
 const db=createSupabaseAdminClient() as any;const {data,error}=await db.rpc('email_queue_seller_campaign',{p_actor:current.user.id,p_store:value.store,p_request:request,p_subject:value.subject,p_body:value.body});if(error)return {ok:false,message:errorMessage(String(error.message))};
 revalidatePath('/store/dashboard/email-campaigns');return {ok:true,message:`${data.count} məktub göndəriş növbəsinə əlavə edildi.`};
}
export async function loadSellerEmailCenter(){
 const current=await requireSeller('/store/dashboard/email-campaigns');const stores=await getSellerEmailStores(current.user.id);
 if(!stores.length)return {stores:[],history:[],enabled:false};const db=createSupabaseAdminClient() as any;
 const [history,settings]=await Promise.all([db.rpc('email_seller_campaign_history',{p_actor:current.user.id}),db.from('email_delivery_settings').select('enabled').eq('id',true).single()]);
 return {stores,history:history.data||[],enabled:settings.data?.enabled===true};
}

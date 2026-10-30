import {expect,it,vi} from 'vitest';
import {createEmailDispatcher} from '../supabase/functions/_shared/delivery';
import {query} from './query';
function setup({eligible=true,marketing=true,template=null}:{eligible?:boolean;marketing?:boolean;template?:any}={}){
 const job={id:'job',lock_token:'lease',kind:'seller_campaign',recipient_id:'buyer',recipient_role:'customer',to_address:'buyer@example.test',payload:{sender_id:'seller',sender_store_id:'store',store_slug:'untrusted',title:'Spoofed',campaign_subject:'Sale',body:'Yeni məhsullar'}};
 const rpc=vi.fn(async(name:string)=>name==='email_claim_jobs'?{data:[job]}:name==='email_seller_eligible_stores'?{data:eligible?[{id:'store',name:'Real shop',slug:'real-shop'}]:[]}:{data:true});
 const from=vi.fn((name:string)=>query({data:name==='email_delivery_settings'?{enabled:true,admin_address:'admin@alisveris.az'}:name==='profiles'?{email:'buyer@example.test',role:'customer'}:name==='email_preferences'?{transactional:true,marketing}:template}));
 const sendMail=vi.fn(async(_message:any)=>({accepted:['buyer@example.test'],messageId:'test-message'})),close=vi.fn();
 const env:Record<string,string>={SMTP_PORT:'465',SMTP_HOST:'smtp.example.test',SMTP_USER:'user',SMTP_PASSWORD:'test-only',SMTP_FROM:'Site <no-reply@example.test>',APP_ORIGIN:'https://alisveris.az',SUPABASE_URL:'https://api.example.test',SUPABASE_SERVICE_ROLE_KEY:'test-key',EMAIL_DELIVERY_ENABLED:'true',EMAIL_DISPATCH_SECRET:'test-dispatch-secret-with-at-least-32-characters'};
 const handle=createEmailDispatcher(k=>env[k]||'',()=>({rpc,from}),()=>({sendMail,close}));
 const call=()=>handle(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer test','x-email-dispatch-secret':env.EMAIL_DISPATCH_SECRET}}));
 return {call,rpc,sendMail,close};
}
it('skips queued seller campaigns after promotion or permission is revoked',async()=>{const t=setup({eligible:false});expect(await (await t.call()).json()).toMatchObject({sent:0,skipped:1});expect(t.sendMail).not.toHaveBeenCalled();expect(t.rpc).toHaveBeenCalledWith('email_seller_eligible_stores',{p_actor:'seller'})});
it('rechecks marketing opt-in at delivery and never falls back to transactional permission',async()=>{const t=setup({marketing:false});expect(await (await t.call()).json()).toMatchObject({skipped:1});expect(t.sendMail).not.toHaveBeenCalled()});
it('takes store branding and URL from current server data and always closes SMTP',async()=>{const t=setup();expect(await (await t.call()).json()).toMatchObject({sent:1});const message=t.sendMail.mock.calls[0]?.[0] as any;expect(message.subject).toBe('Real shop — Sale');expect(message.to).toBe('buyer@example.test');expect(message.html).toContain('/store/real-shop');expect(message.html).not.toContain('/store/untrusted');expect(t.close).toHaveBeenCalledTimes(1)});

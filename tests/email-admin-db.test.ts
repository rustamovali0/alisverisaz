import { afterAll,beforeAll,beforeEach,expect,it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { createEmailTestDatabase,buyer,seller,admin } from "./email-db";
let db:PGlite;
const request="00000000-0000-4000-8000-000000000010";
beforeAll(async()=>{db=await createEmailTestDatabase(true)},30000);
afterAll(async()=>{await db?.close()});
beforeEach(async()=>{await db.exec("reset role; truncate email_outbox,email_campaigns,email_preferences; update email_delivery_settings set enabled=true;")});
async function queue(audience="all",purpose="service",actor=admin,subject="Salam {ad}",selected:string[]=[]){return (await db.query<any>("select email_queue_campaign($1,$2,$3,$4,$5,$6,$7) as result",[actor,request,audience,selected,subject,"Mağaza: {magaza}",purpose])).rows[0].result;}
const jobs=async()=>(await db.query<any>("select * from email_outbox order by recipient_role")).rows;
it("queues customers and sellers separately, or together, and renders safe text variables",async()=>{
  expect((await queue("customer")).count).toBe(1); expect((await jobs())[0].recipient_id).toBe(buyer);
  await db.exec("truncate email_outbox,email_campaigns"); expect((await queue("seller")).count).toBe(1); expect((await jobs())[0].payload.body).toBe("Mağaza: Shop");
  await db.exec("truncate email_outbox,email_campaigns"); expect((await queue()).count).toBe(2);
});
it("only includes explicitly selected eligible accounts",async()=>{expect((await queue("selected","service",admin,"Selected",[seller,admin])).count).toBe(1); expect((await jobs())[0].recipient_id).toBe(seller)});
it("requires marketing opt-in and respects transactional opt-out",async()=>{
  expect((await queue("all","marketing")).count).toBe(0); await db.exec("truncate email_outbox,email_campaigns");
  await db.query("insert into email_preferences values($1,false,true)",[buyer]);
  expect((await queue("all","marketing")).count).toBe(1); expect((await jobs())[0].kind).toBe("campaign_marketing");
  await db.exec("truncate email_outbox,email_campaigns"); expect((await queue()).count).toBe(1);
});
it("excludes banned and deleted accounts",async()=>{
  await db.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[seller]);
  expect((await queue()).count).toBe(1);
  await db.query("update auth.users set banned_until=null where id=$1",[seller]);
});
it("deduplicates retries and rejects reuse with altered content",async()=>{const first=await queue(); expect(await queue()).toEqual(first); expect(await jobs()).toHaveLength(2); await expect(queue("all","service",admin,"Different")).rejects.toThrow("EMAIL_REQUEST_CONFLICT")});
it("requires admin and enabled delivery, rejecting subject header injection",async()=>{
  await expect(queue("all","service",buyer)).rejects.toThrow("EMAIL_ADMIN_REQUIRED");
  await expect(queue("all","service",admin,"Hello\r\nBcc: victim@test.com")).rejects.toThrow("EMAIL_INVALID_CAMPAIGN");
  await db.exec("update email_delivery_settings set enabled=false"); await expect(queue()).rejects.toThrow("EMAIL_DELIVERY_DISABLED");
});
it("queues administrator notices for buyer and requested seller registration",async()=>{
 const ids=["00000000-0000-4000-8000-000000000020","00000000-0000-4000-8000-000000000021"];
 for(let i=0;i<ids.length;i++){await db.query("insert into auth.users(id,raw_user_meta_data) values($1,$2)",[ids[i],{requested_role:i?"seller":"customer",store_name:"Demo"}]); await db.query("insert into profiles values($1,$2,'customer','Demo')",[ids[i],`new${i}@example.test`]);}
 const notices=(await jobs()).filter(j=>j.kind==="registration_admin"); expect(notices).toHaveLength(2); expect(notices.map(j=>j.payload.requested_role).sort()).toEqual(["customer","seller"]); expect(notices.every(j=>j.to_address==="admin@alisveris.az"&&j.recipient_id===null)).toBe(true);
 await db.query("delete from profiles where id=any($1)",[ids]); await db.query("delete from auth.users where id=any($1)",[ids]);
});
it("keeps template/campaign tables and RPCs inaccessible to ordinary API roles",async()=>{
 await db.exec("set role authenticated"); await expect(db.query("select * from email_templates")).rejects.toThrow(/permission denied/); await expect(db.query("select email_campaign_history(20)")).rejects.toThrow(/permission denied/);
});
it("records bounded history and delivery totals",async()=>{await queue(); await db.exec("update email_outbox set status='sent' where recipient_role='seller'"); const h=(await db.query<any>("select email_campaign_history(20) as h")).rows[0].h; expect(h).toHaveLength(1); expect(h[0]).toMatchObject({sent:1,pending:1,failed:0,recipient_count:2})});

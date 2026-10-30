import { PGlite } from "@electric-sql/pglite";
import { createEmailTestDatabase } from "./email-db";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
let db: PGlite;
const buyer = "00000000-0000-4000-8000-000000000001",
  seller = "00000000-0000-4000-8000-000000000002",
  store = "00000000-0000-4000-8000-000000000003";
beforeAll(async () => {
  db = await createEmailTestDatabase();
}, 30000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec(
    "reset role; truncate email_outbox,orders,notifications,product_messages,reviews,products,email_preferences,platform_settings; update email_delivery_settings set enabled=true;",
  );
});
const orders = () =>
  db.query(
    `insert into orders(store_id,user_id) values('${store}','${buyer}') returning id`,
  );
const jobs = async () =>
  (await db.query<any>("select * from email_outbox order by recipient_role"))
    .rows;
const claim = async () =>
  (await db.query<any>("select * from email_claim_jobs(5)")).rows;
const finish = (j: any, result: string, token = j.lock_token) =>
  db.query("select email_finish_job($1,$2,$3) as ok", [j.id, token, result]);
it("is dormant by default and queues nothing while disabled", async () => {
  await db.exec("update email_delivery_settings set enabled=false");
  await orders();
  expect(await jobs()).toHaveLength(0);
  expect(await claim()).toHaveLength(0);
});
it("atomically queues separate buyer and seller emails for a new order", async () => {
  await orders();
  const rows = await jobs();
  expect(rows.map((r) => r.to_address).sort()).toEqual([
    "buyer@example.test",
    "seller@example.test",
  ]);
  expect(rows.every((r) => r.kind === "order_created")).toBe(true);
});
it("rolls email jobs back with the order transaction", async () => {
  await db.exec("begin");
  await orders();
  await db.exec("rollback");
  expect(await jobs()).toHaveLength(0);
});
it("deduplicates event keys and skips unchanged order statuses", async () => {
  const r = await orders();
  const id = (r.rows[0] as any).id;
  await db.query("update orders set status=status where id=$1", [id]);
  expect(await jobs()).toHaveLength(2);
  await db.query(`select email_enqueue($1,'notification','dedupe','{}')`, [
    buyer,
  ]);
  await db.query(`select email_enqueue($1,'notification','dedupe','{}')`, [
    buyer,
  ]);
  expect(await jobs()).toHaveLength(3);
});
it("queues cancellation and payment changes for both parties", async () => {
  await orders();
  await db.exec(
    "update orders set status='canceled'; update orders set payment_status='refunded'",
  );
  const rows = await jobs();
  expect(rows.filter((r) => r.kind === "order_status")).toHaveLength(2);
  expect(rows.filter((r) => r.kind === "order_payment")).toHaveLength(2);
});
it("honors preferences, order toggle, marketing opt-in and missing addresses", async () => {
  await db.query("insert into email_preferences values($1,false,false)", [
    buyer,
  ]);
  await orders();
  expect((await jobs()).map((r) => r.to_address)).toEqual([
    "seller@example.test",
  ]);
  await db.query(
    `insert into notifications(user_id,type,title) values($1,'promo','Sale')`,
    [seller],
  );
  expect(await jobs()).toHaveLength(1);
  await db.exec(
    `insert into platform_settings values('site','{"order_email_notifications_enabled":false}')`,
  );
  await orders();
  expect(await jobs()).toHaveLength(1);
});
it("supports guest order email without inventing or changing an account", async () => {
  await db.exec(
    `insert into customers values('${buyer}','guest@example.test')`,
  );
  await db.exec(
    `insert into orders(store_id,customer_id) values('${store}','${buyer}')`,
  );
  expect((await jobs()).map((r) => r.to_address).sort()).toEqual([
    "guest@example.test",
    "seller@example.test",
  ]);
});
it("captures welcome, seller approval and transactional notifications", async () => {
  const id = "00000000-0000-4000-8000-000000000004";
  await db.query(
    `insert into profiles values($1,'new@example.test','customer','New')`,
    [id],
  );
  await db.query(`update profiles set role='seller' where id=$1`, [id]);
  await db.query(
    `insert into notifications(user_id,type,title) values($1,'product_approved','Approved')`,
    [seller],
  );
  expect((await jobs()).map((r) => r.kind).sort()).toEqual([
    "notification",
    "seller_approved",
    "welcome",
  ]);
});
it("captures a message and reply, new review and threshold-crossing stock warning", async () => {
  await db.exec(
    `insert into product_messages(store_id,sender_id) values('${store}','${buyer}'); update product_messages set reply_message='Reply';
    insert into products(id,store_id,name,stock_quantity) values('${store}','${store}','Test',10);
    insert into reviews(product_id,user_id) values('${store}','${buyer}'); update products set stock_quantity=5; update products set stock_quantity=4;`,
  );
  expect((await jobs()).map((r) => r.kind).sort()).toEqual([
    "message",
    "message_reply",
    "review",
    "stock_low",
  ]);
});
it("does not let public roles read, inject, claim or acknowledge private jobs", async () => {
  await orders();
  await db.exec("set role authenticated");
  try {
    await expect(db.exec("select * from email_outbox")).rejects.toThrow(
      "permission denied",
    );
    await expect(db.exec("select * from email_claim_jobs(5)")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query(`select email_enqueue($1,'notification','attack','{}')`, [
        buyer,
      ]),
    ).rejects.toThrow("permission denied");
  } finally {
    await db.exec("reset role");
  }
});
it("keeps email preferences isolated by RLS", async () => {
  await db.exec(
    `select set_config('request.jwt.claim.sub','${buyer}',false); set role authenticated;`,
  );
  try {
    await expect(
      db.query("insert into email_preferences values($1,false,true)", [seller]),
    ).rejects.toThrow("row-level security");
    await db.query("insert into email_preferences values($1,false,false)", [
      buyer,
    ]);
  } finally {
    await db.exec("reset role");
  }
});
it("leases jobs without overlap and rejects stale or forged acknowledgements", async () => {
  await orders();
  const first = await claim();
  expect(first).toHaveLength(2);
  expect(await claim()).toHaveLength(0);
  expect((await finish(first[0], "sent", first[1].lock_token)).rows[0]).toEqual(
    { ok: false },
  );
  await db.exec(
    "update email_outbox set locked_at=now()-interval '11 minutes'",
  );
  const next = await claim();
  expect((await finish(first[0], "sent")).rows[0]).toEqual({ ok: false });
  expect((await finish(next[0], "sent")).rows[0]).toEqual({ ok: true });
});
it("retries with backoff and stops after six attempts", async () => {
  await orders();
  for (let i = 0; i < 6; i++) {
    const rows = await claim();
    expect(rows).toHaveLength(2);
    for (const j of rows) await finish(j, "retry");
    if (i < 5) {
      expect(await claim()).toHaveLength(0);
      await db.exec(
        "update email_outbox set available_at=now()-interval '1 minute'",
      );
    }
  }
  expect(
    (await jobs()).every((j) => j.status === "failed" && j.attempt_count === 6),
  ).toBe(true);
});

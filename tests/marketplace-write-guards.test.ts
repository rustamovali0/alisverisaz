import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
const seller = "00000000-0000-0000-0000-000000000001";
const store = "00000000-0000-0000-0000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select '${seller}'::uuid $$;
    create function auth.role() returns text language sql as $$ select 'authenticated'::text $$;
    create function public.is_admin() returns boolean language sql as $$ select false $$;
    create table stores (id uuid primary key, owner_id uuid, status text, settings jsonb default '{}');
    create table products (id uuid primary key default gen_random_uuid(), store_id uuid, owner_id uuid, listing_type text, status text, metadata jsonb default '{}');
    insert into stores values ('${store}', '${seller}', 'active', '{}');
    insert into products values ('00000000-0000-0000-0000-000000000003', '${store}', '${seller}', 'store', 'draft', '{"approval_status":"rejected"}');
  `);
  await db.exec(readFileSync("supabase/migrations/20261013010000_marketplace_write_guards.sql", "utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });

it("blocks owner self-approval and limit overrides", async () => {
  await expect(db.exec(`update stores set status='suspended' where id='${store}'`)).rejects.toThrow("STORE_MODERATION_FORBIDDEN");
  await expect(db.exec(`update stores set settings='{"product_limit_override":10000}' where id='${store}'`)).rejects.toThrow("STORE_ENTITLEMENT_FORBIDDEN");
});
it("allows non-privileged seller preferences", async () => {
  await expect(db.exec(`update stores set settings='{"profitTrackingEnabled":true}' where id='${store}'`)).resolves.toBeDefined();
});
it("blocks reactivation and moderation metadata forgery", async () => {
  await expect(db.exec("update products set status='active'")).rejects.toThrow("PRODUCT_MODERATION_FORBIDDEN");
  await expect(db.exec("update products set metadata='{}'")).rejects.toThrow("PRODUCT_MODERATION_FORBIDDEN");
});
it("blocks personal offers even with owned active store", async () => {
  await expect(db.exec(`insert into products values (gen_random_uuid(),'${store}','${seller}','personal','active','{}')`)).rejects.toThrow("APPROVED_STORE_REQUIRED");
});
it("allows approved-store publishing without product approval", async () => {
  await expect(db.exec(`insert into products values (gen_random_uuid(),'${store}','${seller}','store','active','{"approval_status":"none"}')`)).resolves.toBeDefined();
});
it("blocks product ownership transfer", async () => {
  await expect(db.exec(`update products set owner_id='00000000-0000-0000-0000-000000000009'`)).rejects.toThrow("PRODUCT_OWNER_FORBIDDEN");
});

it("imports atomically and replays an idempotent request", async () => {
  await db.exec(`alter table products add column name text, add column slug text, add column price_amount numeric,
    add column cost_amount numeric, add column stock_quantity integer, add column description text, add column category_id uuid;`);
  await db.exec(readFileSync("supabase/migrations/20261013020000_product_import.sql", "utf8"));
  const rows = [{ sku: "IMPORT-1", name: "Product", price: 12, cost: 2, stock: null, description: "", categoryId: null }];
  const args = [store, "00000000-0000-0000-0000-000000000010", "create", JSON.stringify(rows)];
  const first = await db.query("select public.import_store_products($1,$2,$3,$4) as result", args);
  expect(first.rows[0]).toEqual({ result: { added: 1, updated: 0, skipped: 0, errors: 0 } });
  expect((await db.query("select public.import_store_products($1,$2,$3,$4) as result", args)).rows).toEqual(first.rows);
  await expect(db.query("select public.import_store_products($1,$2,$3,$4)", [...args.slice(0, 3), JSON.stringify([{ ...rows[0], price: 13 }])])).rejects.toThrow("IMPORT_REQUEST_CONFLICT");
});

it("enforces existing product-limit trigger for 80+20 and rolls back 80+21", async () => {
  await db.exec(`create function public.get_store_effective_limits(uuid) returns table(product_limit integer) language sql as $$ select 100 $$;`);
  const source = readFileSync("supabase/migrations/20260820210000_admin_controlled_product_image_limits.sql", "utf8");
  await db.exec(source.slice(source.indexOf("create or replace function public.enforce_store_product_entitlement_limit()"), source.indexOf("create or replace function public.enforce_product_image_entitlement_limit()")));
  await db.exec(`insert into products(id,store_id,owner_id,listing_type,status) select gen_random_uuid(),'${store}','${seller}','store','active' from generate_series(1,80-(select count(*)::integer from products));`);
  const rows = Array.from({ length: 21 }, (_, i) => ({ sku: `LIMIT-${i}`, name: `Product ${i}`, price: 1, cost: 0, stock: null, description: "", categoryId: null }));
  await expect(db.query("select public.import_store_products($1,$2,$3,$4)", [store, crypto.randomUUID(), "create", JSON.stringify(rows)])).rejects.toThrow("Məhsul limitiniz dolub");
  expect((await db.query<{ count: number }>("select count(*)::integer as count from products")).rows[0].count).toBe(80);
  await db.query("select public.import_store_products($1,$2,$3,$4)", [store, crypto.randomUUID(), "create", JSON.stringify(rows.slice(0,20))]);
  expect((await db.query<{ count: number }>("select count(*)::integer as count from products")).rows[0].count).toBe(100);
});

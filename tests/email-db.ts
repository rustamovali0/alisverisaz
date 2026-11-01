import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
export const buyer = "00000000-0000-4000-8000-000000000001",
  seller = "00000000-0000-4000-8000-000000000002",
  store = "00000000-0000-4000-8000-000000000003",
  admin = "00000000-0000-4000-8000-000000000009";
export async function createEmailTestDatabase(withAdmin = false) {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',deleted_at timestamptz,banned_until timestamptz);
    create table profiles(id uuid primary key,email text,role text,full_name text);
    create table stores(id uuid primary key,owner_id uuid,name text,status text);
    create table platform_settings(key text primary key,value jsonb);
    create table customers(id uuid primary key,email text);
    create table orders(id uuid primary key default gen_random_uuid(),store_id uuid,user_id uuid,customer_id uuid,status text default 'pending',payment_status text default 'pending');
    create table notifications(id uuid primary key default gen_random_uuid(),user_id uuid,type text,title text,body text);
    create table products(id uuid primary key default gen_random_uuid(),store_id uuid,stock_quantity integer,name text);
    create table product_messages(id uuid primary key default gen_random_uuid(),store_id uuid,sender_id uuid,reply_message text);
    create table reviews(id uuid primary key default gen_random_uuid(),product_id uuid,user_id uuid);
    insert into profiles values('${buyer}','buyer@example.test','customer','Buyer'),('${seller}','seller@example.test','seller','Seller');
    insert into auth.users(id) values('${buyer}'),('${seller}');
    insert into stores values('${store}','${seller}','Shop','active');`,
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261029090000_transactional_email_outbox.sql",
      "utf8",
    ),
  );
  if (withAdmin) {
    await db.exec(
      `insert into profiles values('${admin}','admin@alisveris.az','admin','Admin'); insert into auth.users(id) values('${admin}');`,
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261029100000_email_admin_center.sql",
        "utf8",
      ),
    );
  }
  return db;
}

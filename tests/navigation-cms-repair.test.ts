import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create function gen_random_uuid() returns uuid language sql as $$
      select '00000000-0000-4000-8000-000000000001'::uuid
    $$;
    create type public.user_role as enum ('customer', 'seller', 'admin');
    create table public.profiles (id uuid primary key default gen_random_uuid());
    create function public.is_admin() returns boolean language sql as $$ select true $$;
    create function public.set_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = now(); return new; end;
    $$;
  `);
  await db.exec(
    readFileSync("supabase/migrations/20261014010000_repair_navigation_cms.sql", "utf8"),
  );
}, 30_000);

afterAll(async () => {
  await db?.close();
});

it("repairs the navigation CMS schema without requiring its original migration", async () => {
  const menu = await db.query<{ id: string }>(`
    insert into public.navigation_menus (key, title, location)
    values ('qa-menu', 'QA menu', 'header')
    returning id
  `);
  const menuId = menu.rows[0]?.id;

  await db.exec(`
    insert into public.navigation_items (menu_id, title, href, sort_order)
    values ('${menuId}', 'QA item', '/qa', 1);
  `);

  const result = await db.query<{ count: number }>(
    "select count(*)::integer as count from public.navigation_items where menu_id = $1",
    [menuId],
  );
  expect(result.rows[0]?.count).toBe(1);
});

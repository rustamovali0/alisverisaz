import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("fails closed before reconciliation and reserves provider capacity atomically", async () => {
  const db = new PGlite();
  const owner = crypto.randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create table profiles(id uuid primary key); insert into profiles values('${owner}');`);
    await db.exec(readFileSync("supabase/migrations/20261013030000_storage_reservations.sql", "utf8"));
    await expect(db.query("select * from reserve_image_storage($1,100)", [owner])).rejects.toThrow("STORAGE_CAPACITY_UNAVAILABLE");
    await db.exec("update storage_capacity set baseline_verified_at=now(), budget_bytes=1000");
    const first = await db.query<{ provider: string }>("select * from reserve_image_storage($1,900)", [owner]);
    expect(first.rows[0].provider).toBe("r2");
    const second = await db.query<{ provider: string }>("select * from reserve_image_storage($1,900)", [owner]);
    expect(second.rows[0].provider).toBe("local");
    await expect(db.query("select * from reserve_image_storage($1,101)", [owner])).rejects.toThrow("STORAGE_CAPACITY_UNAVAILABLE");
    const access = await db.query<{ allowed: boolean }>("select has_function_privilege('authenticated','reserve_image_storage(uuid,bigint)','execute') as allowed");
    expect(access.rows[0].allowed).toBe(false);
  } finally { await db.close(); }
}, 30000);

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
let db: PGlite;
const key = "security:v1:" + "a".repeat(64);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role;",
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261102090000_atomic_security_limits.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => db?.close());
it("admits only 5 of 40 concurrent requests sharing one database counter", async () => {
  const results = await Promise.all(
    Array.from({ length: 40 }, () =>
      db.query<{ r: { allowed: boolean } }>(
        "select public.security_consume_rate($1,5,60) r",
        [key],
      ),
    ),
  );
  expect(results.filter((r) => r.rows[0].r.allowed)).toHaveLength(5);
});
it("starts a new window after expiry, without extending it on denied requests", async () => {
  await db.exec(
    `update security_rate_buckets set expires_at=now()-interval '1 second'`,
  );
  const r = await db.query<{ r: { allowed: boolean; remaining: number } }>(
    "select public.security_consume_rate($1,5,60) r",
    [key],
  );
  expect(r.rows[0].r).toMatchObject({ allowed: true, remaining: 4 });
});
it.each(["anon", "authenticated"])(
  "denies %s direct reads and RPC rate resets",
  async (role) => {
    await db.exec("set role " + role);
    try {
      await expect(
        db.exec("select * from security_rate_buckets"),
      ).rejects.toThrow();
      await expect(
        db.query("select security_reset_rate($1)", [key]),
      ).rejects.toThrow();
      await expect(
        db.query("select security_consume_rate($1,5,60)", [key]),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  },
);
it("allows the service role to reset its shared counter", async () => {
  await db.exec("set role service_role");
  try {
    await db.query("select security_reset_rate($1)", [key]);
    const r = await db.query<{ r: { remaining: number } }>(
      "select security_consume_rate($1,5,60) r",
      [key],
    );
    expect(r.rows[0].r.remaining).toBe(4);
  } finally {
    await db.exec("reset role");
  }
});
it("rejects malformed keys and invalid limits using bound SQL parameters", async () => {
  await expect(
    db.query("select security_consume_rate($1,0,60)", [key]),
  ).rejects.toThrow();
  await expect(
    db.query("select security_consume_rate($1,5,60)", [
      "x';drop table profiles;--",
    ]),
  ).rejects.toThrow();
});

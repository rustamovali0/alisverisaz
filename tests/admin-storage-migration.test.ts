import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("exposes the database size only to the server service role", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role;",
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261103180000_admin_storage_usage.sql",
        "utf8",
      ),
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(
        db.query("select public.admin_storage_usage()"),
      ).rejects.toThrow(/permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    const result = await db.query<{ usage: { database_bytes: number } }>(
      "select public.admin_storage_usage() as usage",
    );
    expect(result.rows[0].usage.database_bytes).toBeGreaterThan(0);
  } finally {
    await db.close();
  }
});

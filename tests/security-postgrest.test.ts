import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { literalContains, validatedCursorDate } from "@/lib/security/postgrest";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.waitReady;
}, 30000);
afterAll(async () => db?.close());
it.each([
  "telefon,description.not.is.null",
  "x),or(status.eq.draft)",
  'Quote:" slash:\\',
  "50%_endirim",
  "Əla məhsul",
])(
  "keeps %s within one quoted PostgREST value and bound SQL pattern",
  async (term) => {
    const quoted = literalContains(term);
    // Reserved delimiters must remain inside a single quoted value; only escaped quotes/backslashes may occur within it.
    expect(quoted).toMatch(/^"(?:[^"\\]|\\["\\])*"$/);
    const pattern = JSON.parse(quoted);
    const result = await db.query<{ match: boolean }>(
      "select $1::text ilike $2::text as match",
      ["prefix " + term + " suffix", pattern],
    );
    expect(result.rows[0].match).toBe(true);
  },
);
it("does not let SQL LIKE wildcards in search text match unrelated names", async () => {
  const result = await db.query<{ match: boolean }>(
    "select $1::text ilike $2::text as match",
    ["50Xanything", JSON.parse(literalContains("50%_"))],
  );
  expect(result.rows[0].match).toBe(false);
});
it.each([
  "2026-11-02T00:00:00Z),status.neq.draft",
  "2026-11-02",
  12345,
  {},
  null,
])("rejects non-ISO or injected cursor timestamp %s", (value) => {
  expect(validatedCursorDate(value)).toBeNull();
});
it("preserves sub-millisecond cursor precision for PostgreSQL pagination", () => {
  expect(validatedCursorDate("2026-11-02T00:00:00.123456+00:00")).toBe(
    "2026-11-02T00:00:00.123456+00:00",
  );
});

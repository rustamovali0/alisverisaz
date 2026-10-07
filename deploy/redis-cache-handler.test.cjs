const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const originalLoad = Module._load;
const data = new Map();
let unavailable = false;
const redis = {
  isReady: true,
  on() {},
  async connect() {},
  async get(key) {
    if (unavailable) throw new Error("Redis unavailable");
    return data.get(key) ?? null;
  },
  async set(key, value, options) {
    if (!options?.NX || !data.has(key)) data.set(key, value);
  },
};
class Local {
  async get() { return "local"; }
  async set() { return "local"; }
  async revalidateTag() {}
  resetRequestCache() {}
}
Module._load = function(name, ...args) {
  if (name === "redis") return { createClient: () => redis };
  if (name === "next/dist/server/lib/incremental-cache/file-system-cache") return { default: Local };
  return originalLoad.call(this, name, ...args);
};
const Handler = require("./redis-cache-handler.cjs");
Module._load = originalLoad;
const context = { kind: "FETCH", tags: ["products"] };
const value = { kind: "FETCH", revalidate: 30, data: { body: "products" } };

test("public reads reuse Redis; invalidation expires all public data", async () => {
  const handler = new Handler({});
  assert.equal(await handler.get("list", context), null);
  await handler.set("list", value, context);
  assert.deepEqual((await handler.get("list", context)).value, value);
  await handler.revalidateTag(["products"]);
  assert.equal(await handler.get("list", context), null);
});
test("in-flight reads cannot populate the new epoch after mutation", async () => {
  const handler = new Handler({});
  await handler.get("race", context);
  await handler.revalidateTag("products");
  await handler.set("race", value, context);
  assert.equal(await handler.get("race", context), null);
});
test("untagged/private fetches and rendered pages do not enter Redis", async () => {
  const handler = new Handler({});
  assert.equal(await handler.get("session", { kind: "FETCH", tags: [] }), "local");
  assert.equal(await handler.get("page", { kind: "APP_PAGE", tags: ["products"] }), "local");
});
test("corrupt cache values become misses", async () => {
  const handler = new Handler({});
  await handler.get("corrupt", context);
  await handler.set("corrupt", value, context);
  for (const key of data.keys()) if (key.endsWith(require("node:crypto").createHash("sha256").update("corrupt").digest("hex"))) data.set(key, "bad json");
  assert.equal(await handler.get("corrupt", context), null);
});
test("Redis failures become cache misses without failing the read", async () => {
  unavailable = true;
  try {
    assert.equal(await new Handler({}).get("outage", context), null);
  } finally { unavailable = false; }
});

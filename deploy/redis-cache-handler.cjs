const { createClient } = require("redis");
const { createHash, randomUUID } = require("node:crypto");
const FileSystemCache = require("next/dist/server/lib/incremental-cache/file-system-cache").default;

let client;
let connecting;
let retryAt = 0;
const namespace = process.env.REDIS_CACHE_NAMESPACE || "alisveris:public:v1";
const epochKey = `${namespace}:epoch`;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const publicTag = /^(public-site-settings|homepage|theme-settings|navigation-menus|categories|category:|products|product:|marketplace-stores|store:|store-products:|delivery|faq|help-center|articles|article:)/;

async function connection() {
  if (client?.isReady) return client;
  if (Date.now() < retryAt) return null;
  if (!connecting) {
    client = createClient({
      url: process.env.REDIS_URL,
      disableOfflineQueue: true,
      socket: { connectTimeout: 500, reconnectStrategy: false },
    });
    client.on("error", () => { retryAt = Date.now() + 5000; });
    connecting = client.connect().then(() => client).catch(() => {
      retryAt = Date.now() + 5000;
      return null;
    }).finally(() => { connecting = null; });
  }
  return connecting;
}

async function bounded(operation) {
  let timer;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Redis timeout")), 750);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

async function epoch(redis) {
  await redis.set(epochKey, randomUUID(), { NX: true });
  return redis.get(epochKey);
}

// Only tagged public data goes to Redis; Next's route/file cache stays local.
module.exports = class RedisCacheHandler {
  constructor(context) {
    this.local = new FileSystemCache(context);
    this.pending = new Map();
  }

  async get(key, context) {
    if (context.kind !== "FETCH" || !context.tags?.some((tag) => publicTag.test(tag))) {
      return this.local.get(key, context);
    }
    try {
      return await bounded(async () => {
        const redis = await connection();
        if (!redis) return null;
        const version = await epoch(redis);
        if (!version) return null;
        if (!this.pending.has(key)) this.pending.set(key, version);
        if (this.pending.size > 1000) this.pending.delete(this.pending.keys().next().value);
        const value = await redis.get(`${namespace}:${version}:${digest(key)}`);
        return value ? JSON.parse(value) : null;
      });
    } catch { return null; }
  }

  async set(key, value, context) {
    if (value?.kind !== "FETCH" || !context.tags?.some((tag) => publicTag.test(tag))) {
      return this.local.set(key, value, context);
    }
    const startedVersion = this.pending.get(key);
    this.pending.delete(key);
    // A read must precede a write, so an invalidated in-flight fetch cannot warm a new epoch.
    if (!startedVersion) return;
    try {
      await bounded(async () => {
        const redis = await connection();
        if (!redis) return;
        const ttl = Math.min(86400, Math.max(60, Number(value.revalidate) * 2 || 600));
        await redis.set(`${namespace}:${startedVersion}:${digest(key)}`,
          JSON.stringify({ value, lastModified: Date.now() }), { EX: ttl });
      });
    } catch { /* Cache failure must not turn a successful read into a server error. */ }
  }

  async revalidateTag(tags, durations) {
    await this.local.revalidateTag(tags, durations);
    try {
      await bounded(async () => {
        const redis = await connection();
        if (redis) await redis.set(epochKey, randomUUID());
      });
    } catch {
      console.error("[cache] Redis invalidation failed; entries expire by TTL");
    }
  }

  resetRequestCache() {
    this.pending.clear();
    this.local.resetRequestCache();
  }
};

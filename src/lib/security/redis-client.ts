import "server-only";
import { createClient } from "redis";

let redis: ReturnType<typeof createClient> | undefined;
let connecting: Promise<unknown> | undefined;
export function securityRedisUrl() {
  return process.env.SECURITY_REDIS_URL || process.env.REDIS_URL;
}
export async function securityRedisClient() {
  const url = securityRedisUrl();
  if (!url) throw Error("Security storage is not configured");
  redis ??= createClient({ url, socket: { connectTimeout: 1500, reconnectStrategy: false }, disableOfflineQueue: true });
  if (!redis.listenerCount("error")) redis.on("error", () => {});
  // isOpen becomes true before AUTH/handshake completes. Concurrent callers
  // must await the same connection, particularly the first RAdmin page render.
  if (!redis.isReady) {
    if (!connecting && !redis.isOpen) connecting = redis.connect().finally(() => { connecting = undefined; });
    if (connecting) await connecting;
    if (!redis.isReady) throw Error("Security storage is not ready");
  }
  return redis;
}

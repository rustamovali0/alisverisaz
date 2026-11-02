import "server-only";
/** Only a fixed, server-configured provider origin is permitted. No redirect hop. */
export async function fetchTrustedBytes(
  url: string,
  trustedOrigin: string,
  maxBytes: number,
) {
  const target = new URL(url),
    trusted = new URL(trustedOrigin);
  if (
    target.protocol !== "https:" ||
    target.origin !== trusted.origin ||
    target.username ||
    target.password
  )
    throw Error("UNTRUSTED_REMOTE_ORIGIN");
  const response = await fetch(target, {
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!response.ok || !response.body)
    throw Error("REMOTE_RESOURCE_UNAVAILABLE");
  const length = Number(response.headers.get("content-length"));
  if (length > maxBytes) {
    await response.body.cancel();
    throw Error("REMOTE_RESOURCE_TOO_LARGE");
  }
  const reader = response.body.getReader(),
    parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel();
        throw Error("REMOTE_RESOURCE_TOO_LARGE");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return {
    buffer: Buffer.concat(parts, total),
    contentType:
      response.headers.get("content-type") || "application/octet-stream",
  };
}

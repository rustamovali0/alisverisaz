import "server-only";

import { clientEnv } from "@/lib/config/env.client";

export function resolvePublicAuthOrigin(appUrl: string, rootDomain: string, production: boolean) {
  const configuredUrl = new URL(appUrl);
  const hostname = configuredUrl.hostname.replace(/^\[|\]$/g, "");
  const isLoopback = ["localhost", "127.0.0.1", "::1", "::ffff:7f00:1", "::ffff:127.0.0.1"].includes(hostname);

  if (production && isLoopback) {
    return new URL(`https://${rootDomain}`).origin;
  }

  return configuredUrl.origin;
}

export function getPublicAuthOrigin() {
  // Reverse proxies may expose a loopback request URL. Neither that URL nor
  // caller-controlled Host/Forwarded headers may determine auth destinations.
  return resolvePublicAuthOrigin(clientEnv.appUrl, clientEnv.storeRootDomain, process.env.NODE_ENV === "production");
}

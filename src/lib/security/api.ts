import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/auth/security";
import { consumeRateLimit } from "./rate-limit";
export async function apiRateLimit(
  scope: string,
  limit: number,
  windowSeconds = 60,
) {
  const result = await consumeRateLimit(
    scope,
    await getClientIp(),
    limit,
    windowSeconds,
  );
  return result.ok
    ? null
    : NextResponse.json(
        { ok: false, message: result.message },
        {
          status: result.status,
          headers: {
            "Retry-After": String(result.retryAfter),
            "Cache-Control": "no-store",
          },
        },
      );
}

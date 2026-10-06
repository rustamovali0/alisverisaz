export function isSessionRevoked(revokedAt: string | null | undefined, accessToken?: string | null) {
  const revokedTime = typeof revokedAt === "string" ? Date.parse(revokedAt) : Number.NaN;
  if (!Number.isFinite(revokedTime)) return false;

  try {
    const payload = accessToken?.split(".")[1];
    if (!payload) return true;
    const { iat } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { iat?: unknown };
    return typeof iat !== "number" || !Number.isFinite(iat) || revokedTime > iat * 1000;
  } catch {
    return true;
  }
}

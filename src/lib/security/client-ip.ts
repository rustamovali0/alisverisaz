import { isIP } from "node:net";

function normalize(value: string) {
  if (!isIP(value)) return "";
  if (isIP(value) === 4) return value;
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  if (canonical.startsWith("::ffff:")) {
    const parts = canonical
      .slice(7)
      .split(":")
      .map((part) => parseInt(part, 16));
    if (parts.length === 2)
      return `${parts[0] >>> 8}.${parts[0] & 255}.${parts[1] >>> 8}.${parts[1] & 255}`;
  }
  // Bucket IPv6 privacy addresses by /64; rotating interface IDs cannot evade limits.
  const [left, right = ""] = canonical.split("::");
  const a = left ? left.split(":") : [],
    b = right ? right.split(":") : [];
  return (
    [...a, ...Array(8 - a.length - b.length).fill("0"), ...b]
      .slice(0, 4)
      .join(":") + "::/64"
  );
}
export function resolveClientIp(headers: Pick<Headers, "get">) {
  // These values are safe only when the named ingress overwrites them and the app
  // is loopback-only. Never prefer visitor-supplied CF/True-Client-IP headers.
  const header =
    process.env.VERCEL === "1"
      ? "x-vercel-forwarded-for"
      : process.env.TRUSTED_PROXY_MODE === "nginx"
        ? "x-real-ip"
        : null;
  if (!header) return "unknown";
  return normalize((headers.get(header) || "").trim()) || "unknown";
}

import { mkdir, writeFile } from "node:fs/promises";

const base = new URL(process.argv[2] || "http://localhost:3000");
const checks = [
  { path: "/", status: 200 },
  { path: "/products", status: 200 },
  { path: "/stores", status: 200 },
  { path: "/cart", status: 200 },
  { path: "/login", status: 200 },
  { path: "/forgot-password", status: 200 },
  { path: "/store/dashboard/products", login: "/login" },
  { path: "/store/dashboard/products/new", login: "/login" },
  { path: "/store/dashboard/orders", login: "/login" },
  { path: "/radmin/orders", login: "/radmin/login" },
  { path: "/api/marketplace/products?limit=1", status: 200 },
  { path: "/api/telegram/webhook", status: 403, method: "POST", body: "{}" },
  { path: "/api/marketplace/searches", status: 403, method: "POST", body: "{}", origin: "https://untrusted.example" },
];
const results = [];
for (const check of checks) {
  try {
    const response = await fetch(new URL(check.path, base), {
      method: check.method || "GET",
      body: check.body,
      headers: check.origin ? { origin: check.origin, "content-type": "application/json" } : {},
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    const text = await response.text();
    const location = response.headers.get("location");
    const redirected = location ? new URL(location, base) : null;
    const ok = check.login
      ? [303, 307, 308].includes(response.status) && redirected?.origin === base.origin && redirected.pathname === check.login
      : response.status === check.status && !text.includes('"digest":"') && !text.includes("Nə isə səhv getdi");
    const headerChecks = check.path === "/" ? {
      nosniff: response.headers.get("x-content-type-options") === "nosniff",
      frameProtection: response.headers.get("content-security-policy")?.includes("frame-ancestors 'self'"),
      referrer: response.headers.get("referrer-policy") === "same-origin",
    } : {};
    results.push({ path: check.path, status: response.status, location, headerChecks, ok: ok && Object.values(headerChecks).every(Boolean) });
  } catch (error) {
    results.push({ path: check.path, ok: false, error: error.message });
  }
}
await mkdir("outputs", { recursive: true });
await writeFile("outputs/security-smoke.json", JSON.stringify({ base: base.origin, time: new Date().toISOString(), results }, null, 2));
console.table(results.map(({ path, status, ok }) => ({ path, status, ok })));
if (results.some((result) => !result.ok)) process.exitCode = 1;

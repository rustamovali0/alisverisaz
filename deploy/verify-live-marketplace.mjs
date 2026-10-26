import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:3104";
const headers = process.env.QA_HOST ? { host: process.env.QA_HOST, "x-forwarded-proto": "https" } : {};
const results = [];
async function request(path, status = 200) {
  const response = await fetch(new URL(path, base), { headers, redirect: "manual", signal: AbortSignal.timeout(20000) });
  assert((Array.isArray(status) ? status : [status]).includes(response.status), `${path}: unexpected status ${response.status}`);
  results.push({ path, status: response.status });
  return response;
}
const homepage = await (await request("/")).text();
assert(homepage.includes("live-home"), "Native marketplace homepage missing");
assert(homepage.includes("/_next/"), "Next application assets missing");
assert(!homepage.includes("/marketplace/assets/"), "Prototype runtime still owns homepage");
for (const path of ["/products", "/login", "/register", "/cart", "/stores", "/categories", "/marketplace/images/hero.jpg", "/marketplace/fonts/manrope.css", "/api/auth/session"]) await request(path);
for (const path of ["/dashboard", "/store/dashboard", "/radmin"]) {
  const response = await request(path, 307);
  assert(response.headers.get("location")?.includes("login"), "Protected route must require login");
}
const favorites = await request("/favorites", [200, 307]);
if (favorites.status === 200) assert((await favorites.text()).includes("/login?next="), "Guest favorites must redirect to login");
await request("/api/marketplace/products?minPrice=100&maxPrice=1", 400);
const all = []; let cursor; let previousWasRegular = false;
for (let i = 0; i < 100; i++) {
  const params = new URLSearchParams({limit:"2"}); if (cursor) params.set("cursor",cursor);
  const page = await (await request(`/api/marketplace/products?${params}`)).json();
  assert(Array.isArray(page.products));
  for (const product of page.products) {
    assert(!all.some(p => p.id === product.id), "Pagination repeated a product");
    assert(!(previousWasRegular && product.isPromoted), "VIP product appeared after a regular product");
    previousWasRegular ||= !product.isPromoted;
    all.push(product);
  }
  if (!page.hasMore) break;
  assert(page.nextCursor && page.nextCursor !== cursor, "Pagination cursor did not advance");
  cursor = page.nextCursor;
  if (i === 99) throw Error("Pagination did not terminate");
}
for (const [filter, matches] of [
  ["discount=true", p=>p.discountAmount>0], ["vip=true",p=>p.isPromoted],
  ["commerceType=rental",p=>p.commerceType==="rental"],
  ["minPrice=19&maxPrice=21",p=>Math.max(0,p.priceAmount-p.discountAmount)>=19 && Math.max(0,p.priceAmount-p.discountAmount)<=21],
]) {
  const page = await (await request(`/api/marketplace/products?${filter}`)).json();
  assert(page.products.every(matches), `Incorrect filter ${filter}`);
}
if (all.length) {
  const product = all[0];
  await request(`/store/${product.storeSlug}/products/${product.slug}`);
}
console.log(JSON.stringify({status:"passed",base,productsAcrossPages:all.length,checks:results},null,2));

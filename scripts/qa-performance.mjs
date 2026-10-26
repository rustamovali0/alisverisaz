const DEFAULT_BASE_URL = "https://alisveris.az";
const SAMPLE_COUNT = 5;

const checks = [
  { path: "/", budgetMs: 1200 },
  { path: "/products", budgetMs: 1000 },
  { path: "/stores", budgetMs: 900 },
  { path: "/cart", budgetMs: 1100 },
  { path: "/login", budgetMs: 900 },
];

function percentile(samples, p) {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index] ?? 0;
}

function formatMs(value) {
  return `${Math.round(value)}ms`;
}

async function measure(baseUrl, check) {
  const url = new URL(check.path, baseUrl);
  const samples = [];
  const statuses = [];
  let bytes = 0;

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
      headers: {
        "user-agent": "alisveris-performance-check/1.0",
      },
    });
    const body = await response.arrayBuffer();
    const elapsed = performance.now() - startedAt;

    samples.push(elapsed);
    statuses.push(response.status);
    bytes = body.byteLength;
  }

  const medianMs = percentile(samples, 0.5);
  const p90Ms = percentile(samples, 0.9);
  const okStatus = statuses.every((status) => status === 200);
  const okBudget = medianMs <= check.budgetMs;

  return {
    path: check.path,
    status: [...new Set(statuses)].join(","),
    median: formatMs(medianMs),
    p90: formatMs(p90Ms),
    bytes,
    budget: formatMs(check.budgetMs),
    ok: okStatus && okBudget,
  };
}

async function main() {
  const baseUrl = process.argv[2] ?? DEFAULT_BASE_URL;
  const results = [];
  // Discover a current product instead of treating stale sample URLs/404s as success.
  const response = await fetch(new URL("/api/marketplace/products?limit=1", baseUrl), {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Product discovery failed: ${response.status}`);
  const { products } = await response.json();
  const product = products?.[0];
  if (product?.storeSlug && product?.slug) {
    const storePath = `/store/${encodeURIComponent(product.storeSlug)}`;
    checks.push({ path: storePath, budgetMs: 1100 });
    checks.push({ path: `${storePath}/products/${encodeURIComponent(product.slug)}`, budgetMs: 1100 });
  } else {
    console.warn("No public product available; store/product timing checks skipped.");
  }

  for (const check of checks) {
    results.push(await measure(baseUrl, check));
  }

  console.table(results);

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.error(
      `Performance budget failed for: ${failed.map((result) => result.path).join(", ")}`,
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

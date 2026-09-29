const DEFAULT_BASE_URL = "https://www.alisveris.az";
const SAMPLE_COUNT = 5;

const checks = [
  { path: "/", budgetMs: 1200 },
  { path: "/products", budgetMs: 1000 },
  { path: "/stores", budgetMs: 900 },
  { path: "/cart", budgetMs: 1100 },
  { path: "/login", budgetMs: 900 },
  { path: "/store/ali-rustamov", budgetMs: 1100 },
  {
    path: "/store/ali-rustamov/products/kisi-ucun-cins-salvar-b2ef04ab",
    budgetMs: 1100,
  },
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
  const okStatus = statuses.every((status) => (status >= 200 && status < 400) || status === 404);
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

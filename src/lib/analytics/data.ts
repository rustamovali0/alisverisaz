import { analyticsRangeOptions, getAnalyticsRangeDates, type AnalyticsRange } from "@/lib/analytics/ranges";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ViewRow = {
  id: string;
  viewed_at: string;
  source: string;
  product_id?: string | null;
  store_id?: string | null;
  products?: { name: string; slug: string | null; store_id: string | null } | null;
  stores?: { name: string; slug: string | null } | null;
};

type ChartPoint = {
  label: string;
  productViews: number;
  storeViews: number;
};

function applyRange(query: any, range: AnalyticsRange) {
  const { from, to } = getAnalyticsRangeDates(range);
  let next = query;

  if (from) {
    next = next.gte("viewed_at", from);
  }

  if (to) {
    next = next.lt("viewed_at", to);
  }

  return next;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dayKey(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function buildChart(productViews: ViewRow[], storeViews: ViewRow[]): ChartPoint[] {
  const grouped = new Map<string, ChartPoint>();

  for (const row of productViews) {
    const key = dayKey(row.viewed_at);
    const current = grouped.get(key) ?? { label: key, productViews: 0, storeViews: 0 };
    current.productViews += 1;
    grouped.set(key, current);
  }

  for (const row of storeViews) {
    const key = dayKey(row.viewed_at);
    const current = grouped.get(key) ?? { label: key, productViews: 0, storeViews: 0 };
    current.storeViews += 1;
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).slice(-14);
}

export async function getSellerUniqueAnalytics(userId: string, range: AnalyticsRange) {
  const admin = createSupabaseAdminClient();
  const [productResult, storeResult] = await Promise.all([
    applyRange(
      (admin as any)
        .from("product_views")
        .select("id,product_id,source,viewed_at,products(name,slug,store_id)")
        .eq("seller_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(500),
      range,
    ),
    applyRange(
      (admin as any)
        .from("store_views")
        .select("id,store_id,source,viewed_at,stores(name,slug)")
        .eq("seller_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(500),
      range,
    ),
  ]);

  const productViews = (productResult.data ?? []) as ViewRow[];
  const storeViews = (storeResult.data ?? []) as ViewRow[];
  const productGroups = new Map<string, { title: string; count: number; last: string }>();

  for (const view of productViews) {
    const id = view.product_id ?? view.products?.name ?? view.id;
    const current = productGroups.get(id);

    if (current) {
      current.count += 1;
      continue;
    }

    productGroups.set(id, {
      title: view.products?.name ?? "Məhsul",
      count: 1,
      last: view.viewed_at,
    });
  }

  const topProducts = Array.from(productGroups.entries())
    .map(([id, item]) => ({
      id,
      title: item.title,
      description: `Son baxış: ${formatDateTime(item.last)}`,
      value: String(item.count),
    }))
    .sort((a, b) => Number(b.value) - Number(a.value));

  const topProduct = topProducts[0];
  const shareProductViews = productViews.filter((view) => view.source === "share").length;
  const shareStoreViews = storeViews.filter((view) => view.source === "share").length;

  return {
    range,
    rangeOptions: analyticsRangeOptions,
    hasData: productViews.length + storeViews.length > 0,
    stats: [
      {
        label: "Mağaza ziyarətçiləri",
        value: storeViews.length,
        description: "Mağazaya daxil olan unikal ziyarətçilər",
      },
      {
        label: "Məhsul baxışları",
        value: productViews.length,
        description: "Məhsulların ümumi unikal baxış sayı",
      },
      {
        label: "Məhsul linkləri",
        value: shareProductViews,
        description: "Paylaşılmış məhsul linkindən unikal girişlər",
      },
      {
        label: "Mağaza linkləri",
        value: shareStoreViews,
        description: "Paylaşılmış mağaza linkindən unikal girişlər",
      },
      {
        label: "Ümumi baxış",
        value: productViews.length + storeViews.length,
        description: "Məhsul və mağaza üzrə unikal baxışlar",
      },
      {
        label: "Ən çox baxılan",
        value: topProduct?.title ?? "Yoxdur",
        description: topProduct ? `${topProduct.value} unikal baxış` : "Məhsul baxışı yoxdur",
      },
    ],
    topProducts: topProducts.slice(0, 10),
    storeViews: storeViews.slice(0, 10).map((view) => ({
      id: view.id,
      title: view.stores?.name ?? "Mağaza",
      description: `Son baxış: ${formatDateTime(view.viewed_at)}`,
      value: view.source === "share" ? "Link" : "Normal",
    })),
    recentViews: [...productViews, ...storeViews]
      .sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())
      .slice(0, 12)
      .map((view) => ({
        id: view.id,
        title: view.products?.name ?? view.stores?.name ?? "Baxış",
        description: formatDateTime(view.viewed_at),
        value: view.product_id ? "Məhsul" : "Mağaza",
      })),
    chart: buildChart(productViews, storeViews),
  };
}

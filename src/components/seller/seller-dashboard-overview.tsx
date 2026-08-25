import { AlertTriangle, Bell, Box, PackageCheck, ShoppingCart, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Link } from "@/i18n/navigation";
import type { ManagedOrder } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

type SellerDashboardOverviewProps = {
  overview: {
    currency: string;
    products: {
      total: number;
      active: number;
      draft: number;
      archived: number;
      usage: number;
      limit: number | null;
      usageRatio: number | null;
    };
    orders: {
      total: number;
      new: number;
      processing: number;
      shipped: number;
      completed: number;
      cancelled: number;
      recent: ManagedOrder[];
    };
    sales: {
      today: number;
      last7Days: number;
      month: number;
      completedOrderCount: number;
    };
    unreadNotifications: number;
  };
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency,
  }).format(value);
}

function Stat({
  label,
  value,
  description,
  href,
  tone = "default",
}: {
  label: string;
  value: number | string;
  description?: string;
  href?: string;
  tone?: "default" | "warning" | "success";
}) {
  const content = (
    <article
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm",
        tone === "warning" && "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
        tone === "success" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
      )}
    >
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-normal">{value}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </article>
  );

  return href ? <Link href={href} prefetch className="block transition hover:-translate-y-0.5">{content}</Link> : content;
}

function LimitWarning({
  usage,
  limit,
  usageRatio,
}: {
  usage: number;
  limit: number | null;
  usageRatio: number | null;
}) {
  if (limit === null) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm font-semibold text-muted-foreground">
        Məhsul limiti: limitsiz
      </div>
    );
  }

  if (!usageRatio || usageRatio < 0.8) {
    const remaining = Math.max(limit - usage, 0);

    return (
      <div className="rounded-lg border bg-card p-4 text-sm font-semibold text-muted-foreground">
        <p>{usage} / {limit} elan istifadə olunub</p>
        <p className="mt-1">{remaining} elan limitiniz qalıb</p>
      </div>
    );
  }

  const isFull = usage >= limit;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4", isFull ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300")}>
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-black">{isFull ? "Məhsul limitiniz dolub." : "Məhsul limitinizə yaxınlaşırsınız."}</p>
        <p className="mt-1 text-sm">
          {usage} / {limit} elan istifadə olunub
        </p>
        <p className="mt-1 text-sm">
          {Math.max(limit - usage, 0)} elan limitiniz qalıb
        </p>
      </div>
    </div>
  );
}

export function SellerDashboardOverview({ overview }: SellerDashboardOverviewProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Aktiv məhsullar" value={overview.products.active} description="Satışda olan məhsullar" href="/store/dashboard/products" />
        <Stat label="Draft məhsullar" value={overview.products.draft} description="Tamamlanmamış məhsullar" href="/store/dashboard/products" />
        <Stat label="Yeni sifarişlər" value={overview.orders.new} description="Yeni və təsdiqlənmiş sifarişlər" href="/seller/orders" tone="warning" />
        <Stat label="Oxunmamış bildirişlər" value={overview.unreadNotifications} description="Seller hesabına gələn bildirişlər" href="/store/dashboard/messages" />
      </section>

      <LimitWarning
        usage={overview.products.usage}
        limit={overview.products.limit}
        usageRatio={overview.products.usageRatio}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Hazırlanır" value={overview.orders.processing} href="/seller/orders" />
        <Stat label="Göndərildi" value={overview.orders.shipped} href="/seller/orders" />
        <Stat label="Çatdırıldı" value={overview.orders.completed} href="/seller/orders" tone="success" />
        <Stat label="Ləğv edildi" value={overview.orders.cancelled} href="/seller/orders" />
        <Stat label="Arxiv məhsullar" value={overview.products.archived} href="/store/dashboard/products" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-black">Satış xülasəsi</h2>
          </div>
          <div className="grid gap-3">
            <Stat label="Bu gün" value={formatMoney(overview.sales.today, overview.currency)} href="/store/dashboard/earnings" />
            <Stat label="Son 7 gün" value={formatMoney(overview.sales.last7Days, overview.currency)} href="/store/dashboard/earnings" />
            <Stat label="Bu ay" value={formatMoney(overview.sales.month, overview.currency)} href="/store/dashboard/earnings" />
            <Stat label="Tamamlanmış sifariş" value={overview.sales.completedOrderCount} href="/seller/orders" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-base font-black">Son sifarişlər</h2>
            </div>
            <Link href="/seller/orders" className="text-sm font-bold text-primary">
              Hamısına bax
            </Link>
          </div>
          {overview.orders.recent.length > 0 ? (
            <div className="grid gap-3">
              {overview.orders.recent.map((order) => (
                <Link key={order.id} href="/seller/orders" className="grid gap-2 rounded-lg border bg-background p-3 transition hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">#{order.orderNumber}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{order.customerName} · {order.items.length} məhsul</p>
                    </div>
                    <p className="shrink-0 text-sm font-black">{formatMoney(order.totalAmount, order.currency)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Çatdırılma: {order.deliveryMethod ?? "-"}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="Sifariş yoxdur" description="Yeni sifarişlər burada görünəcək." />
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/store/dashboard/products#create-product" className="rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5">
          <Box className="size-5 text-primary" aria-hidden="true" />
          <p className="mt-2 font-black">Yeni məhsul əlavə et</p>
        </Link>
        <Link href="/store/dashboard/settings" className="rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5">
          <PackageCheck className="size-5 text-primary" aria-hidden="true" />
          <p className="mt-2 font-black">Mağaza ayarları</p>
        </Link>
        <Link href="/store/dashboard/messages" className="rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5">
          <Bell className="size-5 text-primary" aria-hidden="true" />
          <p className="mt-2 font-black">Bildirişlər və mesajlar</p>
        </Link>
      </section>
    </div>
  );
}

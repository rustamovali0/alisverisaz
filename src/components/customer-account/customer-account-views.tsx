import { Bell, CheckCircle2, Heart, MapPin, Package, PackageCheck, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { AccountLanguageSettings } from "@/components/i18n/account-language-settings";
import { Link } from "@/i18n/navigation";
import type {
  CustomerAddress,
  CustomerFavoritePreview,
  CustomerNotificationPreview,
} from "@/lib/customer-account/data";
import type { ManagedOrder, OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

type CustomerProfileSummary = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
};

type CustomerOverview = {
  stats: {
    orders: number;
    activeOrders: number;
    completedOrders: number;
    favorites: number;
    unreadNotifications: number;
  };
  activeOrders: ManagedOrder[];
  favorites: CustomerFavoritePreview[];
  notifications: CustomerNotificationPreview[];
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function deliveryMethodLabel(method: string | null) {
  if (method === "pickup") {
    return "Götürmə";
  }

  if (method === "region") {
    return "Region çatdırılması";
  }

  if (method === "courier") {
    return "Kuryer";
  }

  return "-";
}

function statusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    pending: "Gözləyir",
    confirmed: "Təsdiqləndi",
    processing: "Hazırlanır",
    shipped: "Göndərildi",
    delivered: "Çatdırıldı",
    canceled: "Ləğv edildi",
    refunded: "Geri ödəndi",
    archived: "Arxivləndi",
  };

  return labels[status] ?? status;
}

function statusTone(status: OrderStatus) {
  if (status === "delivered") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (status === "canceled" || status === "refunded") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
  }

  if (status === "shipped" || status === "processing" || status === "confirmed") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", statusTone(status))}>
      {statusLabel(status)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number | string;
  icon: typeof Package;
  href?: string;
}) {
  const content = (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <Icon className="size-5 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-black tracking-normal text-foreground">{value}</p>
    </article>
  );

  return href ? (
    <Link href={href} className="block transition hover:-translate-y-0.5">
      {content}
    </Link>
  ) : (
    content
  );
}

function ProfileOverview({ profile }: { profile: CustomerProfileSummary }) {
  const name = profile.fullName || profile.email || "Hesabım";

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <UserRound className="size-7" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-normal">{name}</h1>
          {profile.email ? <p className="mt-1 truncate text-sm text-muted-foreground">{profile.email}</p> : null}
          {profile.phone ? <p className="mt-1 truncate text-sm text-muted-foreground">{profile.phone}</p> : null}
        </div>
      </div>
    </section>
  );
}

function OrderPreviewCard({ order }: { order: ManagedOrder }) {
  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="block rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">Sifariş #{order.orderNumber}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{order.storeName}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-3 text-base font-black">{formatMoney(order.totalAmount, order.currency)}</p>
    </Link>
  );
}

function FavoritePreviewCard({ favorite }: { favorite: CustomerFavoritePreview }) {
  const href = favorite.storeSlug && favorite.slug ? `/${favorite.storeSlug}/products/${favorite.slug}` : "/favorites";

  return (
    <Link href={href} className="flex min-w-0 gap-3 rounded-lg border bg-card p-3 shadow-sm transition hover:-translate-y-0.5">
      <div className="size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
        {favorite.imageUrl ? (
          <img src={favorite.imageUrl} alt={favorite.name} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{favorite.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatMoney(favorite.priceAmount, favorite.currency)}</p>
      </div>
    </Link>
  );
}

export async function CustomerAccountHome({
  profile,
  overview,
}: {
  profile: CustomerProfileSummary;
  overview: CustomerOverview;
}) {
  const t = await getTranslations("customerAccount");

  return (
    <div className="space-y-5">
      <ProfileOverview profile={profile} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={t("stats.activeOrders")} value={overview.stats.activeOrders} icon={Package} href="/dashboard/orders" />
        <MetricCard label={t("stats.completedOrders")} value={overview.stats.completedOrders} icon={PackageCheck} href="/dashboard/orders" />
        <MetricCard label={t("stats.favorites")} value={overview.stats.favorites} icon={Heart} href="/dashboard/favorites" />
        <MetricCard label={t("stats.notifications")} value={overview.stats.unreadNotifications} icon={Bell} href="/dashboard/notifications" />
      </div>
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-black">{t("activeOrders")}</h2>
            <Link href="/dashboard/orders" className="text-sm font-bold text-primary">
              {t("viewAll")}
            </Link>
          </div>
          {overview.activeOrders.length > 0 ? (
            <div className="grid gap-3">
              {overview.activeOrders.map((order) => <OrderPreviewCard key={order.id} order={order} />)}
            </div>
          ) : (
            <EmptyState title={t("emptyOrders")} description={t("emptyOrdersDescription")} />
          )}
        </div>
        <div className="grid gap-5">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-black">{t("favorites")}</h2>
              <Link href="/dashboard/favorites" className="text-sm font-bold text-primary">
                {t("viewAll")}
              </Link>
            </div>
            <div className="grid gap-2">
              {overview.favorites.length > 0 ? (
                overview.favorites.map((favorite) => <FavoritePreviewCard key={favorite.id} favorite={favorite} />)
              ) : (
                <p className="text-sm text-muted-foreground">{t("emptyFavorites")}</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-black">{t("notifications")}</h2>
              <Link href="/dashboard/notifications" className="text-sm font-bold text-primary">
                {t("viewAll")}
              </Link>
            </div>
            <NotificationList notifications={overview.notifications.slice(0, 3)} emptyText={t("emptyNotifications")} />
          </div>
        </div>
      </section>
    </div>
  );
}

export async function CustomerOrdersView({ orders }: { orders: ManagedOrder[] }) {
  const t = await getTranslations("customerAccount");

  if (orders.length === 0) {
    return <EmptyState className="rounded-lg border bg-card p-8" title={t("emptyOrders")} description={t("emptyOrdersDescription")} />;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="block rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-base font-black">#{order.orderNumber}</p>
              <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt)} · {order.storeName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("deliveryMethod")}: {deliveryMethodLabel(order.deliveryMethod)}</p>
              {order.estimatedDelivery ? <p className="mt-1 text-sm text-muted-foreground">{t("estimatedDelivery")}: {order.estimatedDelivery}</p> : null}
            </div>
            <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
              <StatusBadge status={order.status} />
              <p className="mt-2 text-base font-black">{formatMoney(order.totalAmount, order.currency)}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {order.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm text-muted-foreground">
                <span className="min-w-0 truncate">{item.productName} x {item.quantity}</span>
                <span className="shrink-0">{formatMoney(item.totalAmount, order.currency)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            <span>{t("subtotal")}: {formatMoney(order.subtotalAmount, order.currency)}</span>
            <span>{t("delivery")}: {formatMoney(order.shippingAmount, order.currency)}</span>
            <span>{t("total")}: {formatMoney(order.totalAmount, order.currency)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Timeline({ status }: { status: OrderStatus }) {
  const steps: Array<{ status: OrderStatus; label: string }> = [
    { status: "pending", label: "Sifariş yaradıldı" },
    { status: "confirmed", label: "Təsdiqləndi" },
    { status: "processing", label: "Hazırlanır" },
    { status: "shipped", label: "Göndərildi" },
    { status: "delivered", label: "Çatdırıldı" },
  ];
  const currentIndex = steps.findIndex((step) => step.status === status);
  const isCancelled = status === "canceled" || status === "refunded";

  if (isCancelled) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        Sifariş {statusLabel(status).toLocaleLowerCase("az-AZ")}.
      </div>
    );
  }

  return (
    <ol className="grid gap-3">
      {steps.map((step, index) => {
        const done = currentIndex >= index;

        return (
          <li key={step.status} className="flex items-center gap-3">
            <span className={cn("grid size-8 place-items-center rounded-full border", done ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-muted text-muted-foreground")}>
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </span>
            <span className={cn("text-sm font-semibold", done ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export async function CustomerOrderDetailView({ order }: { order: ManagedOrder }) {
  const t = await getTranslations("customerAccount");

  return (
    <div className="space-y-5">
      <Link href="/dashboard/orders" className="text-sm font-bold text-primary">{t("backToOrders")}</Link>
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-black">#{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt)} · {order.storeName}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-base font-black">{t("products")}</h2>
          <div className="divide-y rounded-lg border bg-background">
            {order.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="size-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{item.productName}</p>
                  {item.sku ? <p className="mt-1 text-xs text-muted-foreground">SKU: {item.sku}</p> : null}
                  {item.variantSnapshot.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.variantSnapshot.map((variant) => (
                        <span
                          key={`${variant.name}-${variant.value}`}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                          {variant.name}: {variant.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">{item.quantity} x {formatMoney(item.unitPrice, order.currency)}</p>
                </div>
                <p className="font-black">{formatMoney(item.totalAmount, order.currency)}</p>
              </div>
            ))}
          </div>
        </div>
        <aside className="space-y-5">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-base font-black">{t("summary")}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt>{t("subtotal")}</dt><dd>{formatMoney(order.subtotalAmount, order.currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>{t("delivery")}</dt><dd>{formatMoney(order.shippingAmount, order.currency)}</dd></div>
              <div className="flex justify-between gap-3 border-t pt-2 font-black"><dt>{t("total")}</dt><dd>{formatMoney(order.totalAmount, order.currency)}</dd></div>
            </dl>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-base font-black">{t("delivery")}</h2>
            <p className="text-sm text-muted-foreground">{order.address}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("deliveryMethod")}: {deliveryMethodLabel(order.deliveryMethod)}</p>
            {order.estimatedDelivery ? <p className="mt-2 text-sm text-muted-foreground">{t("estimatedDelivery")}: {order.estimatedDelivery}</p> : null}
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-base font-black">{t("timeline")}</h2>
            <Timeline status={order.status} />
          </div>
        </aside>
      </section>
    </div>
  );
}

function NotificationList({
  notifications,
  emptyText,
}: {
  notifications: CustomerNotificationPreview[];
  emptyText: string;
}) {
  if (notifications.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="grid gap-2">
      {notifications.map((notification) => (
        <article key={notification.id} className={cn("rounded-lg border p-3", notification.readAt ? "bg-background" : "bg-primary/5")}>
          <p className="text-sm font-bold">{notification.title}</p>
          {notification.body ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.body}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">{formatDate(notification.createdAt)}</p>
        </article>
      ))}
    </div>
  );
}

export async function CustomerNotificationsView({ notifications }: { notifications: CustomerNotificationPreview[] }) {
  const t = await getTranslations("customerAccount");

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <h1 className="mb-3 text-xl font-black">{t("notifications")}</h1>
      <NotificationList notifications={notifications} emptyText={t("emptyNotifications")} />
    </section>
  );
}

export async function CustomerFavoritesView({ favorites }: { favorites: CustomerFavoritePreview[] }) {
  const t = await getTranslations("customerAccount");

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <h1 className="mb-3 text-xl font-black">{t("favorites")}</h1>
      {favorites.length === 0 ? (
        <EmptyState title={t("emptyFavorites")} description={t("emptyFavoritesDescription")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((favorite) => <FavoritePreviewCard key={favorite.id} favorite={favorite} />)}
        </div>
      )}
    </section>
  );
}

export async function CustomerAddressesView({ addresses }: { addresses: CustomerAddress[] }) {
  const t = await getTranslations("customerAccount");

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <h1 className="mb-3 text-xl font-black">{t("addresses")}</h1>
      {addresses.length === 0 ? (
        <EmptyState title={t("emptyAddresses")} description={t("emptyAddressesDescription")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <article key={address.id} className="rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">{address.label}</p>
                {address.isDefault ? <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{t("defaultAddress")}</span> : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{[address.city, address.region].filter(Boolean).join(", ")}</p>
              <p className="mt-1 text-sm text-foreground">{address.address}</p>
              {address.phone ? <p className="mt-2 text-sm text-muted-foreground">{address.phone}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export async function CustomerSettingsView() {
  const t = await getTranslations("customerAccount");

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <h1 className="text-xl font-black">{t("settings")}</h1>
      <div className="mt-4">
        <AccountLanguageSettings />
      </div>
    </section>
  );
}

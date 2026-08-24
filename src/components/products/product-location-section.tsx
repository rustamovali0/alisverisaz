import {
  Bus,
  ExternalLink,
  MapPin,
  Navigation,
  PackageCheck,
  Store,
  Truck,
} from "lucide-react";

import type { ProductLocationAvailability } from "@/lib/locations/types";

type ProductLocationSectionProps = {
  locations: ProductLocationAvailability[];
  compact?: boolean;
};

function getMapUrl(item: ProductLocationAvailability) {
  const { location } = item;

  if (location.mapLink) {
    return location.mapLink;
  }

  if (location.latitude !== null && location.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }

  const query = [location.city, location.district, location.address]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getEmbedUrl(item: ProductLocationAvailability) {
  const { location } = item;
  const query = [location.city, location.district, location.address]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function ProductLocationSection({
  locations,
  compact = false,
}: ProductLocationSectionProps) {
  if (locations.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-5xl rounded-xl border border-primary/15 bg-card p-3 text-card-foreground shadow-sm md:p-4">
      <h2 className="sr-only">Ünvan və nəqliyyat</h2>

      <div className={compact ? "grid gap-2" : "grid gap-3 md:grid-cols-2"}>
        {locations.map((item) => (
          <article
            key={item.id}
            className={compact ? "grid min-w-0 gap-2 rounded-xl border border-primary/15 bg-primary/[0.035] p-3 dark:bg-primary/10" : "grid min-w-0 gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] p-3 dark:bg-primary/10 md:p-4"}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  <Store className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <h3 className="truncate font-semibold">{item.location.storeName ?? item.location.name}</h3>
                </div>
                {item.location.storeName && item.location.storeName !== item.location.name ? (
                  <p className="truncate text-xs text-muted-foreground">{item.location.name}</p>
                ) : null}
                {item.location.showAddress ? (
                  <p className="break-words text-sm text-muted-foreground">
                    {item.location.city}
                    {item.location.district ? `, ${item.location.district}` : ""}
                    {" · "}
                    {item.location.address}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                Stok: {item.stockQuantity}
              </span>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {item.location.showMetro && item.location.nearestMetro ? (
                <div className="flex min-w-0 items-center gap-2">
                  <Navigation className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 break-words">
                    {item.location.nearestMetro}
                    {item.location.metroWalkMinutes
                      ? ` · ${item.location.metroWalkMinutes} dəq. piyada`
                      : ""}
                    {item.location.metroDistanceMeters
                      ? ` · ${item.location.metroDistanceMeters} m`
                      : ""}
                  </span>
                </div>
              ) : null}
              {item.location.showBus && (item.location.busStopName || item.location.busRoutes.length) ? (
                <div className="flex min-w-0 items-center gap-2">
                  <Bus className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 break-words">
                    {item.location.busStopName ?? "Avtobus"}
                    {item.location.busRoutes.length
                      ? ` · ${item.location.busRoutes.join(", ")}`
                      : ""}
                  </span>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                {item.location.pickupAvailable ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-semibold">
                    <PackageCheck className="size-3.5" aria-hidden="true" />
                    Özün götürmə
                  </span>
                ) : null}
                {item.location.deliveryAvailable ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-semibold">
                    <Truck className="size-3.5" aria-hidden="true" />
                    Çatdırılma
                  </span>
                ) : null}
              </div>
            </div>

            {item.location.showMap ? (
              <div className="overflow-hidden rounded-xl border border-primary/15 bg-background">
                <iframe
                  title={`${item.location.name} xəritəsi`}
                  src={getEmbedUrl(item)}
                  loading="lazy"
                  className={compact ? "h-[120px] w-full" : "h-[130px] w-full md:h-[140px]"}
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="flex items-center justify-end border-t bg-muted/30 px-2 py-1.5">
                  <a
                    href={getMapUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Xəritəni böyüt
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

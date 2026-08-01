import { Bus, MapPin, Navigation, PackageCheck, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ProductLocationAvailability } from "@/lib/locations/types";

type ProductLocationSectionProps = {
  locations: ProductLocationAvailability[];
};

function getMapUrl(item: ProductLocationAvailability) {
  const { location } = item;

  if (location.latitude !== null && location.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }

  const query = [location.city, location.district, location.address]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function ProductLocationSection({ locations }: ProductLocationSectionProps) {
  if (locations.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
          <MapPin className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-normal">Ünvan və nəqliyyat</h2>
          <p className="text-sm text-muted-foreground">
            Məhsulun mövcud olduğu satış nöqtələri.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {locations.map((item) => (
          <article
            key={item.id}
            className="grid min-w-0 gap-3 rounded-lg border bg-background p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{item.location.name}</h3>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {item.location.city}
                  {item.location.district ? `, ${item.location.district}` : ""}
                  {" · "}
                  {item.location.address}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                Stok: {item.stockQuantity}
              </span>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground">
              {item.location.nearestMetro ? (
                <div className="flex items-center gap-2">
                  <Navigation className="size-4 text-primary" aria-hidden="true" />
                  <span>
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
              {item.location.busStopName || item.location.busRoutes.length ? (
                <div className="flex items-center gap-2">
                  <Bus className="size-4 text-primary" aria-hidden="true" />
                  <span>
                    {item.location.busStopName ?? "Avtobus"}
                    {item.location.busRoutes.length
                      ? ` · ${item.location.busRoutes.join(", ")}`
                      : ""}
                  </span>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {item.location.pickupAvailable ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    <PackageCheck className="size-3.5" aria-hidden="true" />
                    Özün götürmə
                  </span>
                ) : null}
                {item.location.deliveryAvailable ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    <Truck className="size-3.5" aria-hidden="true" />
                    Çatdırılma
                  </span>
                ) : null}
              </div>
            </div>

            <Button asChild variant="outline" className="w-full">
              <a href={getMapUrl(item)} target="_blank" rel="noreferrer">
                Xəritədə bax
              </a>
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

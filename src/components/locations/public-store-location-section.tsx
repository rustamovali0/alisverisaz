import {
  Bus,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StoreLocation } from "@/lib/locations/types";

type PublicStoreLocationSectionProps = {
  locations: StoreLocation[];
};

function getMapUrl(location: StoreLocation) {
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

export function PublicStoreLocationSection({
  locations,
}: PublicStoreLocationSectionProps) {
  const activeLocations = locations.filter((location) => location.isActive);

  if (activeLocations.length === 0) {
    return null;
  }

  return (
    <section className="mt-4 w-full rounded-xl border bg-card p-3 shadow-sm md:mt-5 md:p-4">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <MapPin className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-black">Mağaza məlumatları</h2>
          <p className="text-xs text-muted-foreground">Ünvan, nəqliyyat və çatdırılma</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {activeLocations.map((location) => (
          <article
            key={location.id}
            className="min-w-0 rounded-xl border border-primary/15 bg-primary/[0.035] p-3.5 dark:bg-primary/10"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-background text-primary shadow-sm">
                  <MapPin className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-bold md:text-base">{location.name}</h3>
                  {location.showAddress ? (
                    <p className="mt-0.5 break-words text-sm leading-5 text-muted-foreground">
                      {[location.city, location.district, location.address].filter(Boolean).join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
              {location.showMap ? (
                <Button asChild variant="outline" size="sm" className="h-8 shrink-0 rounded-lg border-primary/20 bg-background px-2.5 text-xs">
                  <a href={getMapUrl(location)} target="_blank" rel="noreferrer">
                    Xəritə
                    <ExternalLink className="ml-1.5 size-3.5" aria-hidden="true" />
                  </a>
                </Button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {location.showMetro && location.nearestMetro ? (
                <div className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-background px-2 py-1.5 text-xs text-muted-foreground">
                  <Navigation className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">
                    {location.nearestMetro}
                    {location.metroWalkMinutes ? ` · ${location.metroWalkMinutes} dəq.` : ""}
                    {location.metroDistanceMeters ? ` · ${location.metroDistanceMeters} m` : ""}
                  </span>
                </div>
              ) : null}

              {location.showBus && (location.busStopName || location.busRoutes.length) ? (
                <div className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-background px-2 py-1.5 text-xs text-muted-foreground">
                  <Bus className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">
                    {location.busStopName ?? "Avtobus"}
                    {location.busRoutes.length ? ` · ${location.busRoutes.join(", ")}` : ""}
                  </span>
                </div>
              ) : null}

              {location.workingHours ? (
                <div className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-background px-2 py-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{location.workingHours}</span>
                </div>
              ) : null}

              {location.deliveryAvailable ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary">
                  <Truck className="size-3.5" aria-hidden="true" />
                  Çatdırılma var
                </span>
              ) : null}

              {location.pickupAvailable ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary">
                  <PackageCheck className="size-3.5" aria-hidden="true" />
                  Özün götürmə
                </span>
              ) : null}
            </div>

            {location.phone ? (
              <a
                href={`tel:${location.phone.replace(/\s/g, "")}`}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
              >
                <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{location.phone}</span>
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

import {
  Bus,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
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

function getEmbedUrl(location: StoreLocation) {
  const query = [location.city, location.district, location.address]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function PublicStoreLocationSection({
  locations,
}: PublicStoreLocationSectionProps) {
  const activeLocations = locations.filter((location) => location.isActive);

  if (activeLocations.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto mt-6 w-full max-w-5xl rounded-lg bg-card p-4 shadow-sm md:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <MapPin className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-xl font-black tracking-normal">
            Ünvan və nəqliyyat
          </h2>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {activeLocations.map((location) => (
          <article
            key={location.id}
            className="grid min-w-0 gap-3 rounded-lg border bg-background p-4"
          >
            <div className="min-w-0">
              <h3 className="break-words font-semibold">{location.name}</h3>
              {location.showAddress ? (
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {location.city}
                  {location.district ? `, ${location.district}` : ""}
                  {" · "}
                  {location.address}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground">
              {location.showMetro && location.nearestMetro ? (
                <div className="flex min-w-0 items-start gap-2">
                  <Navigation className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 break-words">
                    {location.nearestMetro}
                    {location.metroWalkMinutes
                      ? ` · ${location.metroWalkMinutes} dəq. piyada`
                      : ""}
                    {location.metroDistanceMeters
                      ? ` · ${location.metroDistanceMeters} m`
                      : ""}
                  </span>
                </div>
              ) : null}

              {location.showBus && (location.busStopName || location.busRoutes.length) ? (
                <div className="flex min-w-0 items-start gap-2">
                  <Bus className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 break-words">
                    {location.busStopName ?? "Avtobus"}
                    {location.busRoutes.length
                      ? ` · ${location.busRoutes.join(", ")}`
                      : ""}
                  </span>
                </div>
              ) : null}

              {location.workingHours ? (
                <div className="flex min-w-0 items-start gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 break-words">{location.workingHours}</span>
                </div>
              ) : null}

              {location.phone ? (
                <a
                  href={`tel:${location.phone.replace(/\s/g, "")}`}
                  className="flex min-w-0 items-start gap-2 transition hover:text-primary"
                >
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 break-words">{location.phone}</span>
                </a>
              ) : null}
            </div>

            {location.showMap ? (
              <>
                <Button asChild variant="outline" className="w-full">
                  <a href={getMapUrl(location)} target="_blank" rel="noreferrer">
                    Google Maps-də aç
                    <ExternalLink className="ml-2 size-4" aria-hidden="true" />
                  </a>
                </Button>
                <div className="hidden overflow-hidden rounded-lg border md:block">
                  <iframe
                    title={`${location.name} xəritəsi`}
                    src={getEmbedUrl(location)}
                    loading="lazy"
                    className="h-44 w-full"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

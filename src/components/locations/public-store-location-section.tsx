import {
  Bus,
  Clock,
  ExternalLink,
  Instagram,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Truck,
} from "lucide-react";

import { TikTokIcon } from "@/components/icons/social-icons";
import { Button } from "@/components/ui/button";
import type { StoreLocation } from "@/lib/locations/types";

type PublicStoreLocationSectionProps = {
  locations: StoreLocation[];
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
  };
};

function normalizeSocialHref(kind: "instagram" | "tiktok", value = "") {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return "";
  }

  if (/^https?:\/\//i.test(cleanValue)) {
    return cleanValue;
  }

  const handle = cleanValue.replace(/^@/, "");

  return kind === "instagram"
    ? `https://instagram.com/${handle}`
    : `https://tiktok.com/@${handle}`;
}

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
  socialLinks,
}: PublicStoreLocationSectionProps) {
  const activeLocations = locations.filter((location) => location.isActive);
  const socials = [
    {
      key: "instagram" as const,
      label: "Instagram",
      href: normalizeSocialHref("instagram", socialLinks?.instagram),
      icon: Instagram,
    },
    {
      key: "tiktok" as const,
      label: "TikTok",
      href: normalizeSocialHref("tiktok", socialLinks?.tiktok),
      icon: TikTokIcon,
    },
  ].filter((item) => item.href);

  if (activeLocations.length === 0 && socials.length === 0) {
    return null;
  }

  return (
    <section className="mt-4 w-full overflow-hidden rounded-lg border border-cyan-100 bg-white shadow-sm shadow-teal-950/[0.04] md:mt-5">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-cyan-100 bg-[#f6fbfa] px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-cyan-50 text-cyan-700">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <h2 className="truncate text-base font-black text-slate-950">Mağaza məlumatları</h2>
        </div>
        {socials.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2">
            {socials.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="grid size-9 place-items-center rounded-full border border-cyan-100 bg-white text-slate-600 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        ) : null}
      </div>

      {activeLocations.length > 0 ? (
        <div className="p-3 md:p-4">
          <div className="grid min-w-0 gap-2 md:grid-cols-2">
            {activeLocations.map((location) => (
              <article
                key={location.id}
                className="min-w-0 rounded-lg border border-cyan-100 bg-white p-3 shadow-sm md:p-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-cyan-50 text-cyan-700">
                    <MapPin className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-slate-950 md:text-base">
                      {location.name}
                    </h3>
                    {location.showAddress ? (
                      <div className="mt-1 max-w-full">
                        <p className="break-words text-sm leading-5 text-slate-500">
                          {[location.city, location.district, location.address].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
                {location.showMap ? (
                  <Button asChild variant="outline" size="sm" className="h-8 shrink-0 rounded-full border-cyan-200 bg-cyan-50 px-3 text-xs font-bold text-cyan-800 hover:bg-cyan-100">
                    <a href={getMapUrl(location)} target="_blank" rel="noreferrer">
                      Xəritəni göstər
                      <ExternalLink className="ml-1.5 size-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="mt-3 flex max-w-full flex-wrap items-center gap-1.5">
                {location.showMetro && location.nearestMetro ? (
                  <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f6fbfa] px-2.5 py-1.5 text-xs font-medium text-slate-500">
                    <Navigation className="size-3.5 shrink-0 text-cyan-700" aria-hidden="true" />
                    <span className="min-w-0 break-words">
                      {location.nearestMetro}
                      {location.metroWalkMinutes ? ` · ${location.metroWalkMinutes} dəq.` : ""}
                      {location.metroDistanceMeters ? ` · ${location.metroDistanceMeters} m` : ""}
                    </span>
                  </div>
                ) : null}

                {location.showBus && (location.busStopName || location.busRoutes.length) ? (
                  <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f6fbfa] px-2.5 py-1.5 text-xs font-medium text-slate-500">
                    <Bus className="size-3.5 shrink-0 text-cyan-700" aria-hidden="true" />
                    <span className="min-w-0 break-words">
                      {location.busStopName ?? "Avtobus"}
                      {location.busRoutes.length ? ` · ${location.busRoutes.join(", ")}` : ""}
                    </span>
                  </div>
                ) : null}

                {location.workingHours ? (
                  <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f6fbfa] px-2.5 py-1.5 text-xs font-medium text-slate-500">
                    <Clock className="size-3.5 shrink-0 text-cyan-700" aria-hidden="true" />
                    <span className="min-w-0 break-words">{location.workingHours}</span>
                  </div>
                ) : null}

                {location.deliveryAvailable ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
                    <Truck className="size-3.5" aria-hidden="true" />
                    Çatdırılma var
                  </span>
                ) : null}

                {location.pickupAvailable ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1.5 text-xs font-bold text-cyan-800">
                    <PackageCheck className="size-3.5" aria-hidden="true" />
                    Özün götürmə
                  </span>
                ) : null}

                {location.phone ? (
                  <a
                    href={`tel:${location.phone.replace(/\s/g, "")}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f6fbfa] px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:text-cyan-700"
                  >
                    <Phone className="size-3.5 shrink-0 text-cyan-700" aria-hidden="true" />
                    <span className="min-w-0 break-words">{location.phone}</span>
                  </a>
                ) : null}
              </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

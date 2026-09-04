"use client";

import {
  Bus,
  ChevronDown,
  Clock,
  ExternalLink,
  Instagram,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Truck,
} from "lucide-react";
import { useState } from "react";

import { TikTokIcon } from "@/components/icons/social-icons";
import { Button } from "@/components/ui/button";
import type { StoreLocation } from "@/lib/locations/types";
import { cn } from "@/lib/utils";

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
  const hasSingleLocation = activeLocations.length === 1;
  const hasExpandableLocations = activeLocations.length > 2;
  const [showAllLocations, setShowAllLocations] = useState(false);
  const visibleLocations =
    hasExpandableLocations && !showAllLocations
      ? activeLocations.slice(0, 2)
      : activeLocations;
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
    <section className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card sm:p-5 lg:p-6">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
              Mağaza məlumatları
            </h2>
          </div>
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
                  className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition md:hover:border-blue-200 md:hover:bg-blue-50 md:hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-800 dark:bg-background dark:text-slate-300 dark:md:hover:border-blue-800 dark:md:hover:bg-blue-950/30"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        ) : null}
      </div>

      {activeLocations.length > 0 ? (
        <>
          <div
            className={cn(
              "grid min-w-0 gap-3 sm:gap-4",
              hasSingleLocation
                ? "grid-cols-1"
                : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
            )}
          >
            {visibleLocations.map((location) => (
              <article
                key={location.id}
                className={cn(
                  "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-background sm:p-5",
                  hasSingleLocation && "md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6",
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-blue-600 dark:bg-slate-900 dark:text-blue-300">
                    <MapPin className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 break-words text-base font-semibold text-slate-950 dark:text-slate-100">
                      {location.name}
                    </h3>
                    {location.showAddress ? (
                      <div className="mt-1.5 max-w-full">
                        <p className="break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {[location.city, location.district, location.address].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
                {location.showMap ? (
                  <Button asChild variant="outline" size="sm" className="hidden h-10 shrink-0 rounded-[10px] border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 shadow-none md:hover:border-blue-200 md:hover:bg-blue-50 md:hover:text-blue-700 dark:border-slate-700 dark:bg-background dark:text-slate-100 sm:inline-flex">
                    <a href={getMapUrl(location)} target="_blank" rel="noreferrer">
                      Xəritəni göstər
                      <ExternalLink className="ml-1.5 size-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className={cn("mt-4 flex max-w-full flex-wrap items-center gap-2", hasSingleLocation && "md:mt-0 md:justify-end")}>
                {location.showMetro && location.nearestMetro ? (
                  <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <Navigation className="size-3.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                    <span className="min-w-0 break-words">
                      {location.nearestMetro}
                      {location.metroWalkMinutes ? ` · ${location.metroWalkMinutes} dəq.` : ""}
                      {location.metroDistanceMeters ? ` · ${location.metroDistanceMeters} m` : ""}
                    </span>
                  </div>
                ) : null}

                {location.showBus && (location.busStopName || location.busRoutes.length) ? (
                  <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <Bus className="size-3.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                    <span className="min-w-0 break-words">
                      {location.busStopName ?? "Avtobus"}
                      {location.busRoutes.length ? ` · ${location.busRoutes.join(", ")}` : ""}
                    </span>
                  </div>
                ) : null}

                {location.workingHours ? (
                  <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <Clock className="size-3.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                    <span className="min-w-0 break-words">{location.workingHours}</span>
                  </div>
                ) : null}

                {location.deliveryAvailable ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <Truck className="size-3.5" aria-hidden="true" />
                    Çatdırılma var
                  </span>
                ) : null}

                {location.pickupAvailable ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <PackageCheck className="size-3.5" aria-hidden="true" />
                    Özün götürmə
                  </span>
                ) : null}

                {location.phone ? (
                  <a
                    href={`tel:${location.phone.replace(/\s/g, "")}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition md:hover:border-blue-200 md:hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:md:hover:text-blue-300"
                  >
                    <Phone className="size-3.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                    <span className="min-w-0 break-words">{location.phone}</span>
                  </a>
                ) : null}
                {location.showMap ? (
                  <Button asChild variant="outline" size="sm" className="h-9 rounded-[10px] border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 shadow-none md:hover:border-blue-200 md:hover:bg-blue-50 md:hover:text-blue-700 dark:border-slate-700 dark:bg-background dark:text-slate-100 sm:hidden">
                    <a href={getMapUrl(location)} target="_blank" rel="noreferrer">
                      Xəritəni göstər
                      <ExternalLink className="ml-1.5 size-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                ) : null}
              </div>
              </article>
            ))}
          </div>
          {hasExpandableLocations ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11 w-full rounded-[10px] border-slate-300 bg-white text-sm font-semibold text-slate-900 shadow-none md:w-auto md:px-4 md:hover:border-blue-200 md:hover:bg-blue-50 md:hover:text-blue-700 dark:border-slate-700 dark:bg-background dark:text-slate-100"
              onClick={() => setShowAllLocations((current) => !current)}
              aria-expanded={showAllLocations}
            >
              {showAllLocations
                ? "Filialları yığ"
                : `Bütün filialları göstər (${activeLocations.length})`}
              <ChevronDown
                className={cn("ml-2 size-4 transition-transform", showAllLocations && "rotate-180")}
                aria-hidden="true"
              />
            </Button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

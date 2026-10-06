"use client";

import type { StoreLocation } from "@/lib/locations/types";
import { getGoogleMapEmbedUrl } from "@/lib/locations/map-link";

export function StoreLocationMap({ location, logoUrl, storeName }: {
  location: StoreLocation;
  logoUrl?: string | null;
  storeName?: string;
}) {
  if (!location.showMap) return null;
  const address = [location.city, location.district, location.address].filter(Boolean).join(", ");
  const coordinates: [number, number] | undefined =
    location.latitude !== null && location.longitude !== null
      ? [location.latitude, location.longitude] : undefined;
  return (
    <div className="mt-4 min-w-0 overflow-hidden rounded-lg border md:col-span-2">
      {storeName ? (
        <div className="flex items-center gap-2 border-b bg-background px-3 py-2 text-sm font-semibold">
          {logoUrl ? <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" /> : null}
          <span className="min-w-0 break-words">{storeName}</span>
        </div>
      ) : null}
      <iframe
        title={`${storeName || location.name} xəritəsi`}
        src={getGoogleMapEmbedUrl(location.mapLink, address, coordinates)}
        className="block h-64 w-full border-0 md:h-80"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

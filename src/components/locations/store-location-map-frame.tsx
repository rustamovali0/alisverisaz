"use client";

import type { StoreLocation } from "@/lib/locations/types";
import { getGoogleMapEmbedUrl } from "@/lib/locations/map-link";

export default function StoreLocationMapFrame({
  location,
  storeName,
}: {
  location: StoreLocation;
  storeName?: string;
}) {
  const address = [location.city, location.district, location.address]
    .filter(Boolean)
    .join(", ");
  const coordinates: [number, number] | undefined =
    location.latitude !== null && location.longitude !== null
      ? [location.latitude, location.longitude]
      : undefined;

  return (
    <iframe
      title={`${storeName || location.name} xəritəsi`}
      src={getGoogleMapEmbedUrl(location.mapLink, address, coordinates)}
      className="block h-64 w-full border-0 md:h-80"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}

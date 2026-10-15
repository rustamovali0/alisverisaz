"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { StoreLocation } from "@/lib/locations/types";

const StoreLocationMapFrame = dynamic(
  () => import("@/components/locations/store-location-map-frame"),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-64 w-full animate-pulse bg-slate-100 md:h-80 dark:bg-slate-900"
        aria-label="Xəritə yüklənir"
      />
    ),
  },
);

export function StoreLocationMap({ location, logoUrl, storeName }: {
  location: StoreLocation;
  logoUrl?: string | null;
  storeName?: string;
}) {
  const storefront = useTranslations("storefront");
  const [isOpen, setIsOpen] = useState(false);

  if (!location.showMap) return null;

  return (
    <div className="mt-4 min-w-0 overflow-hidden rounded-lg border md:col-span-2">
      {storeName ? (
        <div className="flex items-center gap-2 border-b bg-background px-3 py-2 text-sm font-semibold">
          {logoUrl ? <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" /> : null}
          <span className="min-w-0 break-words">{storeName}</span>
        </div>
      ) : null}
      {isOpen ? (
        <StoreLocationMapFrame location={location} storeName={storeName} />
      ) : (
        <div className="flex min-h-36 items-center justify-center bg-slate-50 p-4 dark:bg-slate-900/50">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-[10px] border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 shadow-none md:hover:border-blue-200 md:hover:bg-blue-50 md:hover:text-blue-700 dark:border-slate-700 dark:bg-background dark:text-slate-100"
            onClick={() => setIsOpen(true)}
            aria-expanded={isOpen}
          >
            <MapPinned className="mr-1.5 size-4" aria-hidden="true" />
            {storefront("openMapPreview")}
          </Button>
        </div>
      )}
    </div>
  );
}

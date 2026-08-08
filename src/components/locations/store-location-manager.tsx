"use client";

import { MapPin, Power, Save } from "lucide-react";
import { useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  deactivateStoreLocationAction,
  saveStoreLocationAction,
} from "@/lib/locations/actions";
import type { StoreLocation } from "@/lib/locations/types";

type StoreOption = {
  id: string;
  name: string;
};

type StoreLocationManagerProps = {
  stores: StoreOption[];
  locations: StoreLocation[];
};

function routesToText(routes: string[]) {
  return routes.join(", ");
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button type="submit" disabled={pending}>
      <Save className="mr-2 size-4" aria-hidden="true" />
      {pending ? "Saxlanılır" : label}
    </Button>
  );
}

function LocationFields({
  location,
  stores,
  pending,
}: {
  location?: StoreLocation;
  stores: StoreOption[];
  pending: boolean;
}) {
  return (
    <>
      {location ? (
        <input type="hidden" name="locationId" value={location.id} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Mağaza
          <select
            name="storeId"
            defaultValue={location?.storeId ?? stores[0]?.id ?? ""}
            required
            disabled={pending || stores.length === 0}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Satış nöqtəsinin adı
          <input
            name="name"
            defaultValue={location?.name ?? ""}
            placeholder="Məsələn: Nərimanov filialı"
            required
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Şəhər
          <input
            name="city"
            defaultValue={location?.city ?? "Bakı"}
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Rayon
          <input
            name="district"
            defaultValue={location?.district ?? ""}
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Telefon
          <input
            name="phone"
            defaultValue={location?.phone ?? ""}
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Ünvan
        <textarea
          name="address"
          defaultValue={location?.address ?? ""}
          required
          disabled={pending}
          className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Metro
          <input
            name="nearestMetro"
            defaultValue={location?.nearestMetro ?? ""}
            placeholder="28 May"
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Metro məsafəsi (m)
          <input
            name="metroDistanceMeters"
            type="number"
            min="0"
            defaultValue={location?.metroDistanceMeters ?? ""}
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Piyada (dəq.)
          <input
            name="metroWalkMinutes"
            type="number"
            min="0"
            defaultValue={location?.metroWalkMinutes ?? ""}
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          İş saatları
          <input
            name="workingHours"
            defaultValue={location?.workingHours ?? ""}
            placeholder="10:00 - 20:00"
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium md:col-span-2">
          Avtobus dayanacağı
          <input
            name="busStopName"
            defaultValue={location?.busStopName ?? ""}
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium md:col-span-2">
          Avtobus xətləri
          <input
            name="busRoutes"
            defaultValue={routesToText(location?.busRoutes ?? [])}
            placeholder="2, 14, 88"
            disabled={pending}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Google Maps linki
        <input
          name="mapLink"
          type="url"
          inputMode="url"
          defaultValue={location?.mapLink ?? ""}
          placeholder="https://maps.google.com/..."
          disabled={pending}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <div className="flex flex-wrap gap-4 text-sm font-medium">
        <label className="inline-flex items-center gap-2">
          <input
            name="showAddress"
            type="checkbox"
            defaultChecked={location?.showAddress ?? true}
            disabled={pending}
            className="size-4 rounded border-input"
          />
          Ünvanı göstər
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            name="showMetro"
            type="checkbox"
            defaultChecked={location?.showMetro ?? true}
            disabled={pending}
            className="size-4 rounded border-input"
          />
          Metronu göstər
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            name="showBus"
            type="checkbox"
            defaultChecked={location?.showBus ?? true}
            disabled={pending}
            className="size-4 rounded border-input"
          />
          Avtobusu göstər
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            name="showMap"
            type="checkbox"
            defaultChecked={location?.showMap ?? true}
            disabled={pending}
            className="size-4 rounded border-input"
          />
          Xəritəni göstər
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            name="pickupAvailable"
            type="checkbox"
            defaultChecked={location?.pickupAvailable ?? true}
            disabled={pending}
            className="size-4 rounded border-input"
          />
          Özün götürmə
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            name="deliveryAvailable"
            type="checkbox"
            defaultChecked={location?.deliveryAvailable ?? false}
            disabled={pending}
            className="size-4 rounded border-input"
          />
          Çatdırılma
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={location?.isActive ?? true}
            disabled={pending}
            className="size-4 rounded border-input"
          />
          Aktiv
        </label>
      </div>
    </>
  );
}

function LocationForm({
  location,
  stores,
}: {
  location?: StoreLocation;
  stores: StoreOption[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveStoreLocationAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Saxlanmadı");
        return;
      }

      void appAlert.success("Saxlandı", result.message);
    });
  }

  function handleDeactivate() {
    if (!location) {
      return;
    }

    startTransition(async () => {
      const confirm = await appAlert.confirm(
        "Satış nöqtəsi deaktiv edilsin?",
        "Bu nöqtə public səhifədə görünməyəcək.",
      );

      if (!confirm.isConfirmed) {
        return;
      }

      const formData = new FormData();
      formData.set("locationId", location.id);
      formData.set("storeId", location.storeId);
      const result = await deactivateStoreLocationAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Deaktiv edilmədi");
        return;
      }

      void appAlert.success("Deaktiv edildi", result.message);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm"
    >
      <LocationFields location={location} stores={stores} pending={isPending} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton
          label={location ? "Satış nöqtəsini yenilə" : "Satış nöqtəsi yarat"}
          pending={isPending}
        />
        {location ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleDeactivate}
            disabled={isPending || !location.isActive}
          >
            <Power className="mr-2 size-4" aria-hidden="true" />
            Deaktiv et
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function StoreLocationManager({
  stores,
  locations,
}: StoreLocationManagerProps) {
  return (
    <div className="space-y-6">
      {stores.length === 0 ? (
        <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
          Satış nöqtəsi yaratmaq üçün əvvəl mağaza lazımdır.
        </div>
      ) : (
        <LocationForm stores={stores} />
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-primary" aria-hidden="true" />
          <h3 className="text-lg font-semibold tracking-normal">Mövcud satış nöqtələri</h3>
        </div>
        {locations.length === 0 ? (
          <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
            Satış nöqtəsi yoxdur.
          </div>
        ) : (
          locations.map((location) => (
            <details
              key={location.id}
              className="rounded-md border bg-card p-4 text-card-foreground shadow-sm"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{location.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {location.storeName ? `${location.storeName} · ` : ""}
                      {location.city}
                      {location.district ? `, ${location.district}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {location.isActive ? "Aktiv" : "Deaktiv"}
                  </span>
                </div>
              </summary>
              <div className="mt-4">
                <LocationForm location={location} stores={stores} />
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

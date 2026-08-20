"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  updateDeliverySettingsAction,
  updateDeliveryStoreOverrideAction,
} from "@/lib/delivery/actions";
import type {
  DeliverySettings,
  DeliveryStoreOverride,
} from "@/lib/delivery/types";

type AdminDeliverySettingsFormProps = {
  settings: DeliverySettings;
  overrides: DeliveryStoreOverride[];
};

function formatNullableAmount(value: number | null) {
  return value === null ? "" : String(value);
}

function formatBooleanOverride(value: boolean | null) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "inherit";
}

function BooleanOverrideSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: boolean | null;
}) {
  return (
    <select
      name={name}
      defaultValue={formatBooleanOverride(defaultValue)}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="inherit">Qlobal ayarı istifadə et</option>
      <option value="true">Aktiv</option>
      <option value="false">Deaktiv</option>
    </select>
  );
}

export function AdminDeliverySettingsForm({
  settings,
  overrides,
}: AdminDeliverySettingsFormProps) {
  const router = useRouter();
  const [selectedStoreId, setSelectedStoreId] = useState(overrides[0]?.storeId ?? "");
  const [isSettingsPending, startSettingsTransition] = useTransition();
  const [isOverridePending, startOverrideTransition] = useTransition();
  const selectedOverride = useMemo(
    () => overrides.find((override) => override.storeId === selectedStoreId) ?? null,
    [overrides, selectedStoreId],
  );

  function handleSettingsSubmit(formData: FormData) {
    startSettingsTransition(async () => {
      const result = await updateDeliverySettingsAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Ayarlar yenilənmədi");
        return;
      }

      void appAlert.success("Ayarlar yeniləndi", result.message);
      router.refresh();
    });
  }

  function handleOverrideSubmit(formData: FormData) {
    startOverrideTransition(async () => {
      const result = await updateDeliveryStoreOverrideAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Override yenilənmədi");
        return;
      }

      void appAlert.success("Override yeniləndi", result.message);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      <form
        action={handleSettingsSubmit}
        className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              name="pickupEnabled"
              type="checkbox"
              defaultChecked={settings.pickupEnabled}
              className="size-4 rounded border-input"
            />
            Mağazadan götürmə
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              name="courierEnabled"
              type="checkbox"
              defaultChecked={settings.courierEnabled}
              className="size-4 rounded border-input"
            />
            Bakı kuryer
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              name="regionEnabled"
              type="checkbox"
              defaultChecked={settings.regionEnabled}
              className="size-4 rounded border-input"
            />
            Rayon çatdırılması
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium">
            Bakı qiyməti
            <input
              name="bakuPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.bakuPrice}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Rayon qiyməti
            <input
              name="regionPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.regionPrice}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Pulsuz çatdırılma limiti
            <input
              name="freeDeliveryThreshold"
              type="number"
              min="0"
              step="0.01"
              placeholder="Limit yoxdur"
              defaultValue={formatNullableAmount(settings.freeDeliveryThreshold)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium">
            Götürmə müddəti
            <input
              name="pickupEstimate"
              defaultValue={settings.pickupEstimate}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Bakı müddəti
            <input
              name="courierEstimate"
              defaultValue={settings.courierEstimate}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Rayon müddəti
            <input
              name="regionEstimate"
              defaultValue={settings.regionEstimate}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </label>
        </div>
        <Button type="submit" disabled={isSettingsPending}>
          {isSettingsPending ? "Yadda saxlanılır" : "Qlobal ayarları saxla"}
        </Button>
      </form>

      <form
        action={handleOverrideSubmit}
        className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm"
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="delivery-store">
            Mağaza override
          </label>
          <select
            id="delivery-store"
            name="storeId"
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Mağaza seçin</option>
            {overrides.map((override) => (
              <option key={override.storeId} value={override.storeId}>
                {override.storeName}
              </option>
            ))}
          </select>
        </div>
        {selectedOverride ? (
          <div key={selectedOverride.storeId} className="contents">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Götürmə
                <BooleanOverrideSelect
                  name="pickupEnabled"
                  defaultValue={selectedOverride.pickupEnabled}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Bakı kuryer
                <BooleanOverrideSelect
                  name="courierEnabled"
                  defaultValue={selectedOverride.courierEnabled}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Rayon
                <BooleanOverrideSelect
                  name="regionEnabled"
                  defaultValue={selectedOverride.regionEnabled}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Bakı qiyməti
                <input
                  name="bakuPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Qlobal"
                  defaultValue={formatNullableAmount(selectedOverride.bakuPrice)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Rayon qiyməti
                <input
                  name="regionPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Qlobal"
                  defaultValue={formatNullableAmount(selectedOverride.regionPrice)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Pulsuz çatdırılma limiti
                <input
                  name="freeDeliveryThreshold"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Qlobal"
                  defaultValue={formatNullableAmount(
                    selectedOverride.freeDeliveryThreshold,
                  )}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Götürmə müddəti
                <input
                  name="pickupEstimate"
                  placeholder="Qlobal"
                  defaultValue={selectedOverride.pickupEstimate ?? ""}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Bakı müddəti
                <input
                  name="courierEstimate"
                  placeholder="Qlobal"
                  defaultValue={selectedOverride.courierEstimate ?? ""}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Rayon müddəti
                <input
                  name="regionEstimate"
                  placeholder="Qlobal"
                  defaultValue={selectedOverride.regionEstimate ?? ""}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
          </div>
        ) : null}
        <Button type="submit" disabled={isOverridePending || !selectedOverride}>
          {isOverridePending ? "Yadda saxlanılır" : "Mağaza override-unu saxla"}
        </Button>
      </form>
    </div>
  );
}

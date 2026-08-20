import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DeliverySettings, DeliveryStoreOverride } from "@/lib/delivery/types";

type DeliverySettingsRow = {
  pickup_enabled: boolean | null;
  courier_enabled: boolean | null;
  region_enabled: boolean | null;
  baku_price: string | number | null;
  region_price: string | number | null;
  free_delivery_threshold: string | number | null;
  pickup_estimate: string | null;
  courier_estimate: string | null;
  region_estimate: string | null;
};

type StoreRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

type OverrideRow = {
  store_id: string;
  pickup_enabled: boolean | null;
  courier_enabled: boolean | null;
  region_enabled: boolean | null;
  baku_price: string | number | null;
  region_price: string | number | null;
  free_delivery_threshold: string | number | null;
  pickup_estimate: string | null;
  courier_estimate: string | null;
  region_estimate: string | null;
};

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  pickupEnabled: true,
  courierEnabled: true,
  regionEnabled: true,
  bakuPrice: 4,
  regionPrice: 7,
  freeDeliveryThreshold: null,
  pickupEstimate: "Mağazadan götürmə",
  courierEstimate: "1-2 iş günü",
  regionEstimate: "2-5 iş günü",
};

function readNumber(value: string | number | null | undefined) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function readOptionalNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function readSettings(row: DeliverySettingsRow | null | undefined): DeliverySettings {
  if (!row) {
    return DEFAULT_DELIVERY_SETTINGS;
  }

  return {
    pickupEnabled: row.pickup_enabled ?? DEFAULT_DELIVERY_SETTINGS.pickupEnabled,
    courierEnabled: row.courier_enabled ?? DEFAULT_DELIVERY_SETTINGS.courierEnabled,
    regionEnabled: row.region_enabled ?? DEFAULT_DELIVERY_SETTINGS.regionEnabled,
    bakuPrice: readNumber(row.baku_price),
    regionPrice: readNumber(row.region_price),
    freeDeliveryThreshold: readOptionalNumber(row.free_delivery_threshold),
    pickupEstimate:
      row.pickup_estimate || DEFAULT_DELIVERY_SETTINGS.pickupEstimate,
    courierEstimate:
      row.courier_estimate || DEFAULT_DELIVERY_SETTINGS.courierEstimate,
    regionEstimate:
      row.region_estimate || DEFAULT_DELIVERY_SETTINGS.regionEstimate,
  };
}

export async function getDeliverySettings() {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await (supabaseAdmin as any)
    .from("delivery_settings")
    .select(
      "pickup_enabled,courier_enabled,region_enabled,baku_price,region_price,free_delivery_threshold,pickup_estimate,courier_estimate,region_estimate",
    )
    .eq("key", "global")
    .maybeSingle();

  return readSettings(data as DeliverySettingsRow | null);
}

export async function getDeliveryStoreOverrides() {
  const supabaseAdmin = createSupabaseAdminClient();
  const [{ data: stores }, { data: overrides }] = await Promise.all([
    (supabaseAdmin as any)
      .from("stores")
      .select("id,name,slug")
      .order("name", { ascending: true }),
    (supabaseAdmin as any)
      .from("delivery_store_overrides")
      .select(
        "store_id,pickup_enabled,courier_enabled,region_enabled,baku_price,region_price,free_delivery_threshold,pickup_estimate,courier_estimate,region_estimate",
      ),
  ]);
  const overrideMap = new Map(
    ((overrides ?? []) as OverrideRow[]).map((override) => [
      override.store_id,
      override,
    ]),
  );

  return ((stores ?? []) as StoreRow[]).map((store): DeliveryStoreOverride => {
    const override = overrideMap.get(store.id);

    return {
      storeId: store.id,
      storeName: store.name ?? "Mağaza",
      storeSlug: store.slug,
      pickupEnabled: override?.pickup_enabled ?? null,
      courierEnabled: override?.courier_enabled ?? null,
      regionEnabled: override?.region_enabled ?? null,
      bakuPrice: readOptionalNumber(override?.baku_price),
      regionPrice: readOptionalNumber(override?.region_price),
      freeDeliveryThreshold: readOptionalNumber(
        override?.free_delivery_threshold,
      ),
      pickupEstimate: override?.pickup_estimate ?? null,
      courierEstimate: override?.courier_estimate ?? null,
      regionEstimate: override?.region_estimate ?? null,
    };
  });
}

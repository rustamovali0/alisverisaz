import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ProductLocationAvailability,
  StoreLocation,
} from "@/lib/locations/types";

type StoreLocationRow = {
  id: string;
  store_id: string;
  stores?: {
    name?: string | null;
  } | null;
  name: string;
  city: string;
  district: string | null;
  address: string;
  map_link?: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  nearest_metro: string | null;
  metro_distance_meters: number | null;
  metro_walk_minutes: number | null;
  bus_stop_name: string | null;
  bus_routes: string[] | null;
  phone: string | null;
  working_hours: string | null;
  pickup_available: boolean;
  delivery_available: boolean;
  show_address?: boolean | null;
  show_metro?: boolean | null;
  show_bus?: boolean | null;
  show_map?: boolean | null;
  is_active: boolean;
  created_at: string;
};

type ProductLocationRow = {
  id: string;
  product_id: string;
  location_id: string;
  stock_quantity: number;
  is_available: boolean;
  store_locations: StoreLocationRow | null;
};

function isMissingTableError(error: unknown) {
  const value = error as { code?: string; message?: string } | null | undefined;
  const message = String(value?.message ?? "");

  return value?.code === "PGRST205" || value?.code === "42P01" || message.includes("schema cache");
}

function isRecoverableLocationSchemaError(error: unknown) {
  const value = error as { code?: string; message?: string } | null | undefined;
  const message = String(value?.message ?? "").toLowerCase();

  return (
    isMissingTableError(error) ||
    value?.code === "PGRST204" ||
    value?.code === "42703" ||
    message.includes("could not find") ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

function toNumberOrNull(value: string | number | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function toStoreLocation(row: StoreLocationRow): StoreLocation {
  return {
    id: row.id,
    storeId: row.store_id,
    storeName: row.stores?.name ?? undefined,
    name: row.name,
    city: row.city,
    district: row.district,
    address: row.address,
    mapLink: row.map_link ?? null,
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    nearestMetro: row.nearest_metro,
    metroDistanceMeters: row.metro_distance_meters,
    metroWalkMinutes: row.metro_walk_minutes,
    busStopName: row.bus_stop_name,
    busRoutes: row.bus_routes ?? [],
    phone: row.phone,
    workingHours: row.working_hours,
    pickupAvailable: row.pickup_available,
    deliveryAvailable: row.delivery_available,
    showAddress: row.show_address !== false,
    showMetro: row.show_metro !== false,
    showBus: row.show_bus !== false,
    showMap: row.show_map !== false,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function getLocationsForStores(storeIds: string[]) {
  if (storeIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase as any)
    .from("store_locations")
    .select(
      "id,store_id,stores(name),name,city,district,address,map_link,latitude,longitude,nearest_metro,metro_distance_meters,metro_walk_minutes,bus_stop_name,bus_routes,phone,working_hours,pickup_available,delivery_available,show_address,show_metro,show_bus,show_map,is_active,created_at",
    )
    .in("store_id", storeIds)
    .order("created_at", {
      ascending: false,
    });

  if (error && isMissingTableError(error)) {
    return [];
  }

  if (error && isRecoverableLocationSchemaError(error)) {
    const fallback = await (supabase as any)
      .from("store_locations")
      .select(
        "id,store_id,stores(name),name,city,district,address,latitude,longitude,nearest_metro,metro_distance_meters,metro_walk_minutes,bus_stop_name,bus_routes,phone,working_hours,pickup_available,delivery_available,is_active,created_at",
      )
      .in("store_id", storeIds)
      .order("created_at", {
        ascending: false,
      });

    if (fallback.error && isMissingTableError(fallback.error)) {
      return [];
    }

    return ((fallback.data ?? []) as StoreLocationRow[]).map(toStoreLocation);
  }

  return ((data ?? []) as StoreLocationRow[]).map(toStoreLocation);
}

export async function getAllStoreLocations() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase as any)
    .from("store_locations")
    .select(
      "id,store_id,stores(name),name,city,district,address,map_link,latitude,longitude,nearest_metro,metro_distance_meters,metro_walk_minutes,bus_stop_name,bus_routes,phone,working_hours,pickup_available,delivery_available,show_address,show_metro,show_bus,show_map,is_active,created_at",
    )
    .order("created_at", {
      ascending: false,
    });

  if (error && isMissingTableError(error)) {
    return [];
  }

  return ((data ?? []) as StoreLocationRow[]).map(toStoreLocation);
}

export async function getProductLocationMap(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, ProductLocationAvailability[]>();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase as any)
    .from("product_locations")
    .select(
      "id,product_id,location_id,stock_quantity,is_available,store_locations(id,store_id,stores(name),name,city,district,address,map_link,latitude,longitude,nearest_metro,metro_distance_meters,metro_walk_minutes,bus_stop_name,bus_routes,phone,working_hours,pickup_available,delivery_available,show_address,show_metro,show_bus,show_map,is_active,created_at)",
    )
    .in("product_id", productIds);

  const map = new Map<string, ProductLocationAvailability[]>();

  if (error && isMissingTableError(error)) {
    return map;
  }

  const rows =
    error && isRecoverableLocationSchemaError(error)
      ? await (async () => {
          const fallback = await (supabase as any)
            .from("product_locations")
            .select(
              "id,product_id,location_id,stock_quantity,is_available,store_locations(id,store_id,stores(name),name,city,district,address,latitude,longitude,nearest_metro,metro_distance_meters,metro_walk_minutes,bus_stop_name,bus_routes,phone,working_hours,pickup_available,delivery_available,is_active,created_at)",
            )
            .in("product_id", productIds);

          if (fallback.error && isMissingTableError(fallback.error)) {
            return [];
          }

          return (fallback.data ?? []) as ProductLocationRow[];
        })()
      : ((data ?? []) as ProductLocationRow[]);

  for (const row of rows) {
    if (!row.store_locations) {
      continue;
    }

    const item: ProductLocationAvailability = {
      id: row.id,
      productId: row.product_id,
      locationId: row.location_id,
      stockQuantity: row.stock_quantity,
      isAvailable: row.is_available,
      location: toStoreLocation(row.store_locations),
    };
    const list = map.get(item.productId) ?? [];
    list.push(item);
    map.set(item.productId, list);
  }

  return map;
}

export async function getPublicProductLocations(productId: string) {
  const map = await getProductLocationMap([productId]);

  return (map.get(productId) ?? []).filter(
    (item) => item.isAvailable && item.location.isActive,
  );
}

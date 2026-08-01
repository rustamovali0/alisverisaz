"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { getOwnedStores } from "@/lib/dashboard/data";
import type { LocationActionResult } from "@/lib/locations/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function readBusRoutes(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function revalidateLocationSurfaces() {
  revalidatePath("/store/dashboard/locations");
  revalidatePath("/store/dashboard/products");
  revalidatePath("/radmin/locations");
  revalidatePath("/radmin/stores");
  revalidatePath("/");
  revalidatePath("/products");
  revalidateTag("public-marketplace", "max");
}

async function canManageStore(userId: string, role: string, storeId: string) {
  if (role === "admin") {
    return true;
  }

  const stores = await getOwnedStores(userId);

  return stores.some((store) => store.id === storeId);
}

export async function saveStoreLocationAction(
  formData: FormData,
): Promise<LocationActionResult> {
  const current = await requireRole(["seller", "admin"], "/store/dashboard/locations");
  const locationId = readString(formData, "locationId");
  const storeId = readString(formData, "storeId");
  const name = readString(formData, "name");
  const address = readString(formData, "address");

  if (!storeId) {
    return {
      ok: false,
      message: "Mağaza seçilməyib.",
    };
  }

  if (!name || !address) {
    return {
      ok: false,
      message: "Satış nöqtəsinin adı və ünvanı mütləqdir.",
    };
  }

  const allowed = await canManageStore(current.user.id, current.role, storeId);

  if (!allowed) {
    return {
      ok: false,
      message: "Bu mağazanın satış nöqtəsini idarə etmək icazəniz yoxdur.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const payload = {
    store_id: storeId,
    name,
    city: readString(formData, "city") || "Bakı",
    district: readString(formData, "district") || null,
    address,
    latitude: readOptionalNumber(formData, "latitude"),
    longitude: readOptionalNumber(formData, "longitude"),
    nearest_metro: readString(formData, "nearestMetro") || null,
    metro_distance_meters: readOptionalNumber(formData, "metroDistanceMeters"),
    metro_walk_minutes: readOptionalNumber(formData, "metroWalkMinutes"),
    bus_stop_name: readString(formData, "busStopName") || null,
    bus_routes: readBusRoutes(readString(formData, "busRoutes")),
    phone: readString(formData, "phone") || null,
    working_hours: readString(formData, "workingHours") || null,
    pickup_available: readString(formData, "pickupAvailable") === "on",
    delivery_available: readString(formData, "deliveryAvailable") === "on",
    is_active: readString(formData, "isActive") === "on",
  };

  const query = locationId
    ? (supabase as any).from("store_locations").update(payload).eq("id", locationId)
    : (supabase as any).from("store_locations").insert(payload);
  const { error } = await query;

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateLocationSurfaces();

  return {
    ok: true,
    message: locationId ? "Satış nöqtəsi yeniləndi." : "Satış nöqtəsi yaradıldı.",
  };
}

export async function deactivateStoreLocationAction(
  formData: FormData,
): Promise<LocationActionResult> {
  const current = await requireRole(["seller", "admin"], "/store/dashboard/locations");
  const locationId = readString(formData, "locationId");
  const storeId = readString(formData, "storeId");

  if (!locationId || !storeId) {
    return {
      ok: false,
      message: "Satış nöqtəsi tapılmadı.",
    };
  }

  const allowed = await canManageStore(current.user.id, current.role, storeId);

  if (!allowed) {
    return {
      ok: false,
      message: "Bu satış nöqtəsini deaktiv etmək icazəniz yoxdur.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("store_locations")
    .update({
      is_active: false,
    })
    .eq("id", locationId)
    .eq("store_id", storeId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateLocationSurfaces();

  return {
    ok: true,
    message: "Satış nöqtəsi deaktiv edildi.",
  };
}

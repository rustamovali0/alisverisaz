"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { recordAdminAudit } from "@/lib/admin/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DeliveryActionResult } from "@/lib/delivery/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readCheckbox(formData: FormData, key: string) {
  return readString(formData, key) === "on";
}

function readRequiredAmount(formData: FormData, key: string) {
  const value = Number(readString(formData, key));

  return Number.isFinite(value) && value >= 0 ? value : null;
}

function readOptionalAmount(formData: FormData, key: string) {
  const rawValue = readString(formData, key);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) && value >= 0 ? value : null;
}

function readOverrideBoolean(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function revalidateDeliveryPaths() {
  revalidatePath("/radmin/delivery");
  revalidatePath("/admin/delivery");
  revalidatePath("/cart");
}

export async function updateDeliverySettingsAction(
  formData: FormData,
): Promise<DeliveryActionResult> {
  const current = await requireRole(["admin"], "/radmin/delivery");

  const bakuPrice = readRequiredAmount(formData, "bakuPrice");
  const regionPrice = readRequiredAmount(formData, "regionPrice");
  const freeDeliveryThreshold = readOptionalAmount(
    formData,
    "freeDeliveryThreshold",
  );
  const pickupEstimate = readString(formData, "pickupEstimate");
  const courierEstimate = readString(formData, "courierEstimate");
  const regionEstimate = readString(formData, "regionEstimate");

  if (
    bakuPrice === null ||
    regionPrice === null ||
    pickupEstimate.length < 2 ||
    courierEstimate.length < 2 ||
    regionEstimate.length < 2
  ) {
    return {
      ok: false,
      message: "Çatdırılma ayarları yanlışdır.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await (supabaseAdmin as any)
    .from("delivery_settings")
    .upsert(
      {
        key: "global",
        pickup_enabled: readCheckbox(formData, "pickupEnabled"),
        courier_enabled: readCheckbox(formData, "courierEnabled"),
        region_enabled: readCheckbox(formData, "regionEnabled"),
        baku_price: bakuPrice,
        region_price: regionPrice,
        free_delivery_threshold: freeDeliveryThreshold,
        pickup_estimate: pickupEstimate,
        courier_estimate: courierEstimate,
        region_estimate: regionEstimate,
      },
      { onConflict: "key" },
    );

  if (error) {
    return {
      ok: false,
      message: "Çatdırılma ayarları yenilənmədi.",
    };
  }

  revalidateDeliveryPaths();
  await recordAdminAudit({
    adminId: current.user.id,
    action: "ADMIN_DELIVERY_SETTINGS_UPDATE",
    entityType: "delivery_settings",
    entityId: null,
    metadata: {
      pickup_enabled: readCheckbox(formData, "pickupEnabled"),
      courier_enabled: readCheckbox(formData, "courierEnabled"),
      region_enabled: readCheckbox(formData, "regionEnabled"),
    },
  });

  return {
    ok: true,
    message: "Çatdırılma ayarları yeniləndi.",
  };
}

export async function updateDeliveryStoreOverrideAction(
  formData: FormData,
): Promise<DeliveryActionResult> {
  const current = await requireRole(["admin"], "/radmin/delivery");

  const storeId = readString(formData, "storeId");

  if (!UUID_PATTERN.test(storeId)) {
    return {
      ok: false,
      message: "Mağaza seçimi yanlışdır.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await (supabaseAdmin as any)
    .from("delivery_store_overrides")
    .upsert(
      {
        store_id: storeId,
        pickup_enabled: readOverrideBoolean(formData, "pickupEnabled"),
        courier_enabled: readOverrideBoolean(formData, "courierEnabled"),
        region_enabled: readOverrideBoolean(formData, "regionEnabled"),
        baku_price: readOptionalAmount(formData, "bakuPrice"),
        region_price: readOptionalAmount(formData, "regionPrice"),
        free_delivery_threshold: readOptionalAmount(
          formData,
          "freeDeliveryThreshold",
        ),
        pickup_estimate: readString(formData, "pickupEstimate") || null,
        courier_estimate: readString(formData, "courierEstimate") || null,
        region_estimate: readString(formData, "regionEstimate") || null,
      },
      { onConflict: "store_id" },
    );

  if (error) {
    return {
      ok: false,
      message: "Mağaza çatdırılma override-u yenilənmədi.",
    };
  }

  revalidateDeliveryPaths();
  await recordAdminAudit({
    adminId: current.user.id,
    action: "ADMIN_DELIVERY_STORE_OVERRIDE_UPDATE",
    entityType: "delivery_store_overrides",
    entityId: storeId,
    metadata: { store_id: storeId },
  });

  return {
    ok: true,
    message: "Mağaza override-u yeniləndi.",
  };
}

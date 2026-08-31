import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProductApprovalSettings = {
  requireApproval: boolean;
};

const DEFAULT_PRODUCT_APPROVAL_SETTINGS: ProductApprovalSettings = {
  requireApproval: false,
};

function readBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

export function normalizeProductApprovalSettings(value: unknown): ProductApprovalSettings {
  const row =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    requireApproval: readBoolean(
      row.require_approval ?? row.requireApproval,
      DEFAULT_PRODUCT_APPROVAL_SETTINGS.requireApproval,
    ),
  };
}

export async function getProductApprovalSettings(): Promise<ProductApprovalSettings> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", "product_approval")
      .maybeSingle();

    return normalizeProductApprovalSettings(data?.value);
  } catch {
    return DEFAULT_PRODUCT_APPROVAL_SETTINGS;
  }
}

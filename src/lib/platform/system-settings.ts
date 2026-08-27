import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  systemFlagDefaults,
  type SystemFlagKey,
  type SystemFlags,
} from "@/lib/platform/system-flags";

export { systemFlagDefaults };
export type { SystemFlagKey, SystemFlags };

function readBooleanFlag(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const enabled = (value as Record<string, unknown>).enabled;

    if (typeof enabled === "boolean") {
      return enabled;
    }
  }

  return fallback;
}

export async function getSystemFlags(): Promise<SystemFlags> {
  try {
    const supabase = createSupabaseAdminClient();
    const keys = Object.keys(systemFlagDefaults) as SystemFlagKey[];
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("key,value")
      .in("key", keys);
    const values = new Map(
      ((data ?? []) as Array<{ key: SystemFlagKey; value: unknown }>).map((row) => [
        row.key,
        row.value,
      ]),
    );

    return keys.reduce<SystemFlags>((flags, key) => {
      flags[key] = readBooleanFlag(values.get(key), systemFlagDefaults[key]);

      return flags;
    }, { ...systemFlagDefaults });
  } catch {
    return { ...systemFlagDefaults };
  }
}

export async function getSystemFlag(key: SystemFlagKey) {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    return readBooleanFlag(data?.value, systemFlagDefaults[key]);
  } catch {
    return systemFlagDefaults[key];
  }
}

export async function setSystemFlag(key: SystemFlagKey, value: boolean) {
  const supabase = createSupabaseAdminClient();
  await (supabase as any).from("platform_settings").upsert({
    key,
    value,
  });
}

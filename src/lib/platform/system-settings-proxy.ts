import { clientEnv } from "@/lib/config/env.client";
import { serverEnv } from "@/lib/config/env.server";
import {
  systemFlagDefaults,
  type SystemFlagKey,
  type SystemFlags,
} from "@/lib/platform/system-flags";

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

export async function getSystemFlagsForProxy(): Promise<SystemFlags> {
  if (!serverEnv.supabaseSecretKey) {
    return { ...systemFlagDefaults };
  }

  const keys = Object.keys(systemFlagDefaults) as SystemFlagKey[];
  const url = new URL("/rest/v1/platform_settings", clientEnv.supabaseUrl);
  url.searchParams.set("select", "key,value");
  url.searchParams.set("key", `in.(${keys.join(",")})`);

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serverEnv.supabaseSecretKey,
        authorization: `Bearer ${serverEnv.supabaseSecretKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ...systemFlagDefaults };
    }

    const rows = (await response.json()) as Array<{
      key: SystemFlagKey;
      value: unknown;
    }>;
    const values = new Map(rows.map((row) => [row.key, row.value]));

    return keys.reduce<SystemFlags>((flags, key) => {
      flags[key] = readBooleanFlag(values.get(key), systemFlagDefaults[key]);

      return flags;
    }, { ...systemFlagDefaults });
  } catch {
    return { ...systemFlagDefaults };
  }
}

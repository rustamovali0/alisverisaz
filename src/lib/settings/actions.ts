"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SettingsActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export async function updateDepositSettingsAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  await requireRole(["admin"], "/radmin/settings");
  const enabled = formData.get("enabled") === "on";
  const supabase = await createSupabaseServerClient();
  const { error } = await (supabase as any).from("platform_settings").upsert({
    key: "deposit",
    value: {
      enabled,
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/radmin/settings");
  revalidatePath("/products");

  return {
    ok: true,
    message: enabled ? "Beh sistemi aktiv edildi." : "Beh sistemi deaktiv edildi.",
  };
}

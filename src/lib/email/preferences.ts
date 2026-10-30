"use server";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getEmailPreferences() {
  const current = await requireRole(
    ["customer", "seller"],
    "/dashboard/settings",
  );
  const db = await createSupabaseServerClient({ authScope: "public" });
  const { data, error } = await (db as any).from("email_preferences").select(
    "transactional,marketing",
  ).eq("user_id", current.user.id).maybeSingle();
  return {
    available: !error,
    transactional: data?.transactional !== false,
    marketing: data?.marketing === true,
  };
}
export async function saveEmailPreferences(formData: FormData) {
  const current = await requireRole(
    ["customer", "seller"],
    "/dashboard/settings",
  );
  const db = await createSupabaseServerClient({ authScope: "public" });
  const { error } = await (db as any).from("email_preferences").upsert({
    user_id: current.user.id,
    transactional: formData.get("transactional") === "on",
    marketing: formData.get("marketing") === "on",
  }, { onConflict: "user_id" });
  return error
    ? {
      ok: false,
      message: "E-poçt ayarları saxlanılmadı. Bir az sonra yenidən yoxlayın.",
    }
    : { ok: true, message: "E-poçt ayarları saxlanıldı." };
}

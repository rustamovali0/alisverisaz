"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LogActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

async function verifyAdminPassword(formData: FormData, redirectTo: string) {
  const current = await requireRole(["admin"], redirectTo);
  const password = readString(formData, "password");

  if (!password) {
    return {
      ok: false as const,
      message: "Silmək üçün admin şifrəsini daxil edin.",
      current,
    };
  }

  if (!current.user.email) {
    return {
      ok: false as const,
      message: "Admin emaili tapılmadı.",
      current,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: current.user.email,
    password,
  });

  if (error) {
    return {
      ok: false as const,
      message: "Admin şifrəsi yanlışdır.",
      current,
    };
  }

  return {
    ok: true as const,
    current,
  };
}

export async function clearUserActivityLogsAction(formData: FormData): Promise<LogActionResult> {
  const verified = await verifyAdminPassword(formData, "/radmin/user-activity-log");

  if (!verified.ok) {
    return {
      ok: false,
      message: verified.message,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("activity_events")
    .delete()
    .gte("created_at", "1970-01-01T00:00:00.000Z");

  if (error) {
    return {
      ok: false,
      message: "İstifadəçi fəaliyyət logları silinmədi.",
    };
  }

  revalidatePath("/radmin/activity");
  revalidatePath("/radmin/user-activity-log");

  return {
    ok: true,
    message: "İstifadəçi və satıcı fəaliyyət logları silindi.",
  };
}

export async function clearAdminAuditLogsAction(formData: FormData): Promise<LogActionResult> {
  const verified = await verifyAdminPassword(formData, "/radmin/audit-log");

  if (!verified.ok) {
    return {
      ok: false,
      message: verified.message,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("admin_audit_logs")
    .delete()
    .gte("created_at", "1970-01-01T00:00:00.000Z");

  if (error) {
    return {
      ok: false,
      message: "Audit logları silinmədi.",
    };
  }

  revalidatePath("/radmin/audit-log");

  return {
    ok: true,
    message: "Audit logları silindi.",
  };
}

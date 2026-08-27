import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuthRole } from "@/lib/auth/types";

async function getProfileIdsByRole(role: AuthRole) {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("profiles")
    .select("id")
    .eq("role", role);

  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

export async function revokeRoleSessions(role: AuthRole) {
  const supabase = createSupabaseAdminClient();
  const userIds = await getProfileIdsByRole(role);
  const revokedAt = new Date().toISOString();
  let failed = 0;

  if (userIds.length > 0) {
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ session_revoked_at: revokedAt })
      .in("id", userIds);

    if (error) {
      failed = userIds.length;
    }
  }

  if (role === "admin") {
    await (supabase as any)
      .from("admin_session_registry")
      .update({
        is_active: false,
        last_logout_all_at: revokedAt,
      })
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  return {
    requested: userIds.length,
    revoked: failed > 0 ? 0 : userIds.length,
    failed,
  };
}

export async function revokeAdminSessions() {
  return revokeRoleSessions("admin");
}

export async function revokeSellerSessions() {
  return revokeRoleSessions("seller");
}

export async function revokeCustomerSessions() {
  return revokeRoleSessions("customer");
}

export async function markAdminSessionActive(input: {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    await (supabase as any).from("admin_session_registry").upsert({
      user_id: input.userId,
      last_login_at: new Date().toISOString(),
      is_active: true,
      metadata: {
        ip: input.ip ?? null,
        user_agent: input.userAgent ?? null,
      },
    });
  } catch {
    // Session registry is operational metadata and must not block login.
  }
}

export async function markAdminSessionInactive(userId?: string | null) {
  if (!userId) {
    return;
  }

  try {
    const supabase = createSupabaseAdminClient();
    await (supabase as any)
      .from("admin_session_registry")
      .update({ is_active: false })
      .eq("user_id", userId);
  } catch {
    // Best-effort logout bookkeeping.
  }
}

export async function getAdminSessionStatus() {
  try {
    const supabase = createSupabaseAdminClient();
    const [{ count }, { data }] = await Promise.all([
      (supabase as any)
        .from("admin_session_registry")
        .select("user_id", { count: "exact", head: true })
        .eq("is_active", true),
      (supabase as any)
        .from("admin_session_registry")
        .select("last_login_at")
        .order("last_login_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      activeCount: Number(count ?? 0),
      lastLoginAt: typeof data?.last_login_at === "string" ? data.last_login_at : null,
    };
  } catch {
    return {
      activeCount: 0,
      lastLoginAt: null,
    };
  }
}

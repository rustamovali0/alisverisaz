"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { trackActivityEvent } from "@/lib/activity/events";
import { getDashboardPath } from "@/lib/auth/redirects";
import { ensureAuthProfile } from "@/lib/auth/profiles";
import { requireRole } from "@/lib/auth/session";
import {
  isAuthRole,
  isPublicAuthRole,
  type AuthResult,
  type AuthRole,
} from "@/lib/auth/types";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeNextPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "";
  }

  return value;
}

async function upsertProfile(input: {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AuthRole;
}) {
  try {
    await ensureAuthProfile(input);

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Profil yaradıla bilmədi."),
    };
  }
}

export async function registerAction(formData: FormData): Promise<AuthResult> {
  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const requestedRole = readString(formData, "role");
  const role: AuthRole = isPublicAuthRole(requestedRole) ? requestedRole : "customer";

  if (!fullName || !email || !password) {
    return {
      ok: false,
      message: "Ad, email və şifrə mütləqdir.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      ok: false,
      message: "Düzgün email daxil edin.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      message: "Şifrə minimum 8 simvol olmalıdır.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  if (!data.user) {
    return {
      ok: false,
      message: "İstifadəçi yaradılarkən xəta baş verdi.",
    };
  }

  const { error: profileError } = await upsertProfile({
    id: data.user.id,
    email: data.user.email ?? email,
    fullName,
    role,
  });

  if (profileError) {
    return {
      ok: false,
      message: profileError.message,
    };
  }

  await trackActivityEvent({
    eventType: "user_register",
    actorId: data.user.id,
    metadata: {
      title: "Yeni qeydiyyat",
      description: `${fullName} (${role})`,
      email,
      role,
    },
  });

  return {
    ok: true,
    message: data.session
      ? "Qeydiyyat tamamlandı."
      : "Qeydiyyat tamamlandı. Email təsdiqi aktivdirsə, girişdən öncə emailinizi yoxlayın.",
    redirectTo: data.session ? getDashboardPath(role) : "/admin",
  };
}

export async function loginAction(formData: FormData): Promise<AuthResult> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const nextPath = normalizeNextPath(readString(formData, "next"));
  const mode = readString(formData, "mode") === "admin" ? "admin" : "public";

  if (!email || !password) {
    return {
      ok: false,
      message: "Email və şifrə mütləqdir.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  if (!data.user) {
    return {
      ok: false,
      message: "Sessiya yaradılarkən xəta baş verdi.",
    };
  }

  const metadataRole = data.user.user_metadata?.role;
  const fallbackRole: AuthRole =
    data.user.email?.toLowerCase() === "rustamovali664@gmail.com" ||
    metadataRole === "admin"
      ? "admin"
      : isAuthRole(metadataRole)
        ? metadataRole
        : "customer";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,full_name")
    .eq("id", data.user.id)
    .returns<{ role: AuthRole; full_name: string | null }[]>()
    .maybeSingle();

  const role = profile?.role ?? fallbackRole;

  if (mode === "admin" && role !== "admin") {
    await supabase.auth.signOut();

    return {
      ok: false,
      message: "Bu giriş yalnız admin hesabı üçündür.",
    };
  }

  if (mode === "public" && role === "admin") {
    await supabase.auth.signOut();

    return {
      ok: false,
      message: "Admin girişi üçün /radmin/login səhifəsindən istifadə edin.",
    };
  }

  if (!profile) {
    try {
      await ensureAuthProfile({
        id: data.user.id,
        email: data.user.email ?? email,
        fullName:
          typeof data.user.user_metadata?.full_name === "string"
            ? data.user.user_metadata.full_name
            : null,
        role,
      });
    } catch (profileError) {
      return {
        ok: false,
        message:
          profileError instanceof Error
            ? profileError.message
            : "Profil bərpa edilə bilmədi.",
      };
    }
  }

  await trackActivityEvent({
    eventType: "user_login",
    actorId: data.user.id,
    metadata: {
      title: "Login",
      description: `${data.user.email ?? email} (${role})`,
      email: data.user.email ?? email,
      role,
    },
  });

  return {
    ok: true,
    message: "Giriş uğurludur.",
    redirectTo: nextPath || getDashboardPath(role),
  };
}

export async function logoutAction(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await trackActivityEvent({
    eventType: "user_logout",
    actorId: data.user?.id ?? null,
    metadata: {
      title: "Logout",
      description: data.user?.email ?? "Hesabdan çıxış edildi",
      email: data.user?.email,
    },
  });

  return {
    ok: true,
    message: "Hesabdan çıxış edildi.",
    redirectTo: "/admin",
  };
}

export async function updateUserRoleAction(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const current = await requireRole(["admin"], "/radmin/users");
  const userId = readString(formData, "userId");
  const role = readString(formData, "role");

  if (!userId || !isAuthRole(role)) {
    return {
      ok: false,
      message: "Rol müştəri, satıcı və ya admin ola bilər.",
    };
  }

  if (current.user.id === userId && role !== "admin") {
    return {
      ok: false,
      message: "Öz admin rolunuzu dəyişmək olmaz.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      role,
    })
    .eq("id", userId);

  if (profileError) {
    return {
      ok: false,
      message: profileError.message,
    };
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      role,
    },
  });

  if (authError) {
    return {
      ok: false,
      message: authError.message,
    };
  }

  revalidatePath("/radmin/users");

  return {
    ok: true,
    message: "İstifadəçi rolu yeniləndi.",
  };
}

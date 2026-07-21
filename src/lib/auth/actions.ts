"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDashboardPath } from "@/lib/auth/redirects";
import { ensureAuthProfile } from "@/lib/auth/profiles";
import { requireRole } from "@/lib/auth/session";
import type { AuthResult, AuthRole } from "@/lib/auth/types";

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
  const role: AuthRole = "seller";

  if (!fullName || !email || !password) {
    return {
      ok: false,
      message: "Ad, email ve sifre mutleqdir.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      ok: false,
      message: "Duzgun email daxil edin.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      message: "Sifre minimum 8 simvol olmalidir.",
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
      message: "Istifadeci yaradilarken xeta bas verdi.",
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

  return {
    ok: true,
    message: data.session
      ? "Qeydiyyat tamamlandi."
      : "Qeydiyyat tamamlandi. Email tesdiqi aktivdirse, girisden once emailinizi yoxlayin.",
    redirectTo: data.session ? getDashboardPath(role) : "/login",
  };
}

export async function loginAction(formData: FormData): Promise<AuthResult> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const nextPath = normalizeNextPath(readString(formData, "next"));

  if (!email || !password) {
    return {
      ok: false,
      message: "Email ve sifre mutleqdir.",
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
      message: "Session yaradilarken xeta bas verdi.",
    };
  }

  const metadataRole = data.user.user_metadata?.role;
  const fallbackRole: AuthRole =
    data.user.email?.toLowerCase() === "rustamovali664@gmail.com" ||
    metadataRole === "admin"
      ? "admin"
      : "seller";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,full_name")
    .eq("id", data.user.id)
    .returns<{ role: AuthRole; full_name: string | null }[]>()
    .maybeSingle();

  const role = profile?.role ?? fallbackRole;

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

  return {
    ok: true,
    message: "Giris ugurludur.",
    redirectTo: nextPath || getDashboardPath(role),
  };
}

export async function logoutAction(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: "Hesabdan cixis edildi.",
    redirectTo: "/login",
  };
}

export async function updateUserRoleAction(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const current = await requireRole(["admin"], "/admin/users");
  const userId = readString(formData, "userId");
  const role = readString(formData, "role");

  if (!userId || (role !== "seller" && role !== "admin")) {
    return {
      ok: false,
      message: "Rol yalnız satıcı və ya admin ola bilər.",
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

  revalidatePath("/admin/users");

  return {
    ok: true,
    message: "İstifadəçi rolu yeniləndi.",
  };
}

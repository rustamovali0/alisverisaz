"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { trackActivityEvent } from "@/lib/activity/events";
import { getDashboardPath } from "@/lib/auth/redirects";
import { ensureAuthProfile } from "@/lib/auth/profiles";
import { normalizeAzerbaijanPhone } from "@/lib/phone";
import { requireRole } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/cms/data";
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
  phone?: string | null;
  avatarUrl?: string | null;
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
  const phone = normalizeAzerbaijanPhone(readString(formData, "phone"));
  const avatarUrl = readString(formData, "avatarUrl") || null;
  const bannerUrl = readString(formData, "bannerUrl") || null;
  const role: AuthRole = isPublicAuthRole(requestedRole) ? requestedRole : "customer";
  const accountRole: AuthRole = role === "seller" ? "customer" : role;
  const siteSettings = await getSiteSettings();

  if (role === "customer" && !siteSettings.userRegistrationEnabled) {
    return {
      ok: false,
      message: "İstifadəçi qeydiyyatı hazırda bağlıdır.",
    };
  }

  if (role === "seller" && !siteSettings.storeRegistrationEnabled) {
    return {
      ok: false,
      message: "Mağaza qeydiyyatı hazırda bağlıdır.",
    };
  }

  if (!fullName || !email || !password || !phone) {
    return {
      ok: false,
      message: "Ad, email, telefon və şifrə mütləqdir.",
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

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
      role: accountRole,
      requested_role: role,
      seller_application_status: role === "seller" ? "pending" : "active",
    },
  });

  if (error) {
    return {
      ok: false,
      message:
        error.message.toLowerCase().includes("already")
          ? "Bu email ilə hesab artıq mövcuddur."
          : error.message,
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
    phone,
    avatarUrl,
    role: accountRole,
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
      description:
        role === "seller"
          ? `${fullName} (${role}) · admin təsdiqi gözlənilir`
          : `${fullName} (${role})`,
      email,
      role: accountRole,
      requestedRole: role,
    },
  });

  return {
    ok: true,
    message:
      role === "seller"
        ? "Satıcı müraciətiniz göndərildi. Əsas admin təsdiqləyəndən sonra hesab aktiv olacaq."
        : "Qeydiyyat tamamlandı. Hesabınıza giriş edə bilərsiniz.",
    redirectTo: "/login",
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
      message: "Email və ya şifrə səhvdir.",
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
        phone:
          typeof data.user.user_metadata?.phone === "string"
            ? data.user.user_metadata.phone
            : null,
        avatarUrl:
          typeof data.user.user_metadata?.avatar_url === "string"
            ? data.user.user_metadata.avatar_url
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
    redirectTo: "/login",
  };
}

export async function updateCustomerProfileAction(formData: FormData): Promise<AuthResult> {
  const current = await requireRole(["customer"], "/dashboard/profile");
  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email").toLowerCase();
  const phone = normalizeAzerbaijanPhone(readString(formData, "phone"));

  if (!fullName || !email || !phone) {
    return {
      ok: false,
      message: "Ad soyad, email və telefon mütləqdir.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      ok: false,
      message: "Düzgün email daxil edin.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    current.user.id,
    {
      email,
      user_metadata: {
        ...(current.user.user_metadata ?? {}),
        full_name: fullName,
        phone,
      },
    },
  );

  if (authError) {
    return {
      ok: false,
      message: authError.message,
    };
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: fullName,
      email,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.user.id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/profile", "page");

  return {
    ok: true,
    message: "Profil məlumatları yeniləndi.",
    redirectTo: "/dashboard/profile",
  };
}

export async function updateUserRoleAction(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const current = await requireRole(["admin"], "/radmin/users");
  const userId = readString(formData, "userId");
  const action = readString(formData, "applicationAction");
  const selectedRole = readString(formData, "role");
  const role = action === "reject" ? "customer" : selectedRole;

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
  const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const existingMeta = existingUser.user?.user_metadata ?? {};
  const mergedMetadata = {
    ...existingMeta,
    role,
    seller_application_status:
      action === "reject"
        ? "rejected"
        : role === "seller"
          ? "approved"
          : existingMeta.seller_application_status ?? "active",
    requested_role:
      action === "reject" && existingMeta.requested_role === "seller"
        ? "seller"
        : existingMeta.requested_role ?? null,
  };

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
    user_metadata: mergedMetadata,
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

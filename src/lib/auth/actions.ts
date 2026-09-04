"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { recordAdminAudit } from "@/lib/admin/audit";
import {
  markAdminSessionActive,
  markAdminSessionInactive,
} from "@/lib/admin/session-control";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { trackActivityEvent } from "@/lib/activity/events";
import { getDashboardPath } from "@/lib/auth/redirects";
import { ensureAuthProfile, ensureSellerStore } from "@/lib/auth/profiles";
import { clientEnv } from "@/lib/config/env.client";
import { normalizeAzerbaijanPhone } from "@/lib/phone";
import { requireRole } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/cms/data";
import { serverEnv } from "@/lib/config/env.server";
import { getSystemFlags } from "@/lib/platform/system-settings";
import { recordImageMediaAsset } from "@/lib/storage/media-assets";
import { uploadImageToR2 } from "@/lib/storage/r2";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { sendWelcomeRegistrationEmail } from "@/lib/email/welcome";
import {
  notifyAdminLogin,
  notifyAdminLoginFailed,
  notifySellerRegistered,
  notifyUserRegistered,
} from "@/lib/telegram/notifications";
import {
  assertAuthRateLimit,
  getClientIp,
  readCaptchaToken,
  recordAuthRateLimitAttempt,
  resetAuthRateLimit,
  verifyCaptchaToken,
} from "@/lib/auth/security";
import {
  isAuthRole,
  isPublicAuthRole,
  type AuthResult,
  type AuthRole,
} from "@/lib/auth/types";

const MAX_AUTH_MEDIA_SIZE = 5 * 1024 * 1024;
const ALLOWED_AUTH_MEDIA_TYPES = ["image/*"];
const GENERIC_LOGIN_ERROR = "Email və ya şifrə səhvdir.";
const GENERIC_RESET_RESPONSE =
  "Əgər bu email ilə hesab varsa, bərpa linki göndəriləcək.";
const PASSWORD_RESET_SEND_ERROR =
  "Bərpa emaili göndərilmədi. Bir az sonra yenidən yoxlayın.";
const PASSWORD_RESET_CONFIG_ERROR =
  "Şifrə bərpası üçün email ayarları tamamlanmayıb.";
const PASSWORD_RESET_INACTIVE_ACCOUNT =
  "Sizin aktiv hesabınız yoxdur.";
const PASSWORD_RESET_TIMEOUT_MS = 15_000;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readFile(formData: FormData, key: string) {
  const value = formData.get(key);

  return value instanceof File && value.size > 0 ? value : null;
}

async function uploadAuthMediaFile(input: {
  file: File;
  userId: string;
  kind: "avatar" | "banner";
}) {
  const uploaded = await uploadImageToR2({
    file: input.file,
    folder: `seller-applications/${input.userId}/${input.kind}`,
    maxSizeBytes: MAX_AUTH_MEDIA_SIZE,
    allowedMimeTypes: ALLOWED_AUTH_MEDIA_TYPES,
  });

  await recordImageMediaAsset({
    uploaded,
    originalFileName: input.file.name,
    altText: input.kind === "avatar" ? "Satıcı profil şəkli" : "Satıcı banner şəkli",
    userId: input.userId,
    metadata: {
      source: "seller-registration",
      kind: input.kind,
    },
  });

  return uploaded.url;
}

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase().slice(0, 320);
}

function isMissingAuthUserError(error: { message?: string; code?: string; status?: number }) {
  const message = error.message ?? "";
  const code = error.code ?? "";

  return (
    error.status === 404 ||
    /user.*not.*found|not.*found|does not exist/i.test(message) ||
    /user.*not.*found|not.*found/i.test(code)
  );
}

function isLocalhostOrigin(value: string) {
  try {
    const hostname = new URL(value).hostname;

    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function isLocalhostHost(value: string) {
  const host = value.split(":")[0]?.toLowerCase() ?? "";

  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function withAuthTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} vaxt limitini keçdi.`)),
          PASSWORD_RESET_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function getPublicRequestOrigin() {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host");
  const forwardedProto = headerList.get("x-forwarded-proto") ?? "https";
  const host = forwardedHost ?? headerList.get("host");

  if (host && !isLocalhostHost(host)) {
    return `${forwardedProto}://${host}`;
  }

  if (clientEnv.appUrl && !isLocalhostOrigin(clientEnv.appUrl)) {
    return clientEnv.appUrl.replace(/\/+$/, "");
  }

  return host ? `${forwardedProto}://${host}` : clientEnv.appUrl;
}

function normalizeNextPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "";
  }

  return value;
}

async function getRequestOrigin() {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host");
  const forwardedProto = headerList.get("x-forwarded-proto") ?? "https";
  const host = forwardedHost ?? headerList.get("host");
  const origin = headerList.get("origin");

  if (origin) {
    return origin;
  }

  return host ? `${forwardedProto}://${host}` : clientEnv.appUrl;
}

async function recordLoginFailure(
  rateLimitRule: Parameters<typeof recordAuthRateLimitAttempt>[0],
  fallbackMessage = GENERIC_LOGIN_ERROR,
) {
  const attempt = await recordAuthRateLimitAttempt(rateLimitRule);

  return attempt.isBlocked ? attempt.message : fallbackMessage;
}

async function getClientUserAgent() {
  const headerList = await headers();

  return headerList.get("user-agent")?.slice(0, 500) ?? "";
}

async function recordAdminLoginFailure(input: {
  rateLimitRule: Parameters<typeof recordAuthRateLimitAttempt>[0];
  login: string;
  ip: string;
  userAgent: string;
  reason: string;
  fallbackMessage?: string;
}) {
  const message = await recordLoginFailure(
    input.rateLimitRule,
    input.fallbackMessage ?? GENERIC_LOGIN_ERROR,
  );

  void notifyAdminLoginFailed({
    login: input.login,
    ip: input.ip,
    userAgent: input.userAgent,
    reason: input.reason,
  });
  void recordAdminAudit({
    action: "ADMIN_LOGIN_FAILED",
    success: false,
    metadata: {
      login: input.login,
      ip: input.ip,
      user_agent: input.userAgent,
      reason: input.reason,
    },
  });

  return message;
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
  const fullNameInput = readString(formData, "fullName");
  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const fullName = fullNameInput || [firstName, lastName].filter(Boolean).join(" ").trim();
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");
  const requestedRole = readString(formData, "role");
  const phone = normalizeAzerbaijanPhone(readString(formData, "phone"));
  const avatarFile = readFile(formData, "avatarFile");
  const bannerFile = readFile(formData, "bannerFile");
  const agreedToTerms = formData.get("terms") === "on";
  const nextPath = normalizeNextPath(readString(formData, "next"));
  const role: AuthRole = isPublicAuthRole(requestedRole) ? requestedRole : "customer";
  const accountRole: AuthRole = role === "seller" ? "customer" : role;
  const [siteSettings, systemFlags] = await Promise.all([
    getSiteSettings(),
    getSystemFlags(),
  ]);

  if (!systemFlags.site_enabled) {
    return {
      ok: false,
      message: "Sayt hazırda texniki xidmət rejimindədir.",
    };
  }

  if (role === "customer" && !systemFlags.user_access_enabled) {
    return {
      ok: false,
      message: "İstifadəçi qeydiyyatı hazırda bağlıdır.",
    };
  }

  if (role === "seller" && !systemFlags.seller_panel_enabled) {
    return {
      ok: false,
      message: "Satıcı qeydiyyatı hazırda bağlıdır.",
    };
  }

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

  if (!fullName || !email || !password || !confirmPassword || !phone) {
    return {
      ok: false,
      message: "Ad, email, telefon, şifrə və şifrənin təkrarı mütləqdir.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      ok: false,
      message: "Düzgün email daxil edin.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      message: "Şifrələr uyğun gəlmir.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      message: "Şifrə minimum 8 simvol olmalıdır.",
    };
  }

  if (!agreedToTerms) {
    return {
      ok: false,
      message: "Qeydiyyat üçün istifadəçi razılaşmasını təsdiqləyin.",
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
      requested_role: role,
      seller_application_status: role === "seller" ? "pending" : "active",
    },
  });

  if (error) {
    const lowerMessage = error.message.toLowerCase();

    return {
      ok: false,
      message:
        lowerMessage.includes("already") || lowerMessage.includes("registered")
          ? "Bu email ilə hesab artıq mövcuddur."
          : lowerMessage.includes("password")
            ? "Şifrə təhlükəsizlik tələblərinə uyğun deyil."
            : "Qeydiyyat tamamlanmadı. Məlumatları yoxlayıb yenidən cəhd edin.",
    };
  }

  if (
    !data.user ||
    (Array.isArray(data.user.identities) && data.user.identities.length === 0)
  ) {
    return {
      ok: false,
      message: "Bu email ilə hesab artıq mövcuddur.",
    };
  }

  let avatarUrl: string | null = null;
  let bannerUrl: string | null = null;

  if (role === "seller") {
    try {
      if (avatarFile) {
        avatarUrl = await uploadAuthMediaFile({
          file: avatarFile,
          userId: data.user.id,
          kind: "avatar",
        });
      }

      if (bannerFile) {
        bannerUrl = await uploadAuthMediaFile({
          file: bannerFile,
          userId: data.user.id,
          kind: "banner",
        });
      }

      if (avatarUrl || bannerUrl) {
        await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            ...data.user.user_metadata,
            avatar_url: avatarUrl,
            banner_url: bannerUrl,
          },
        });
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Şəkil yüklənmədi.",
      };
    }
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
      message: "Profil yaradıla bilmədi. Yenidən cəhd edin.",
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

  if (role === "seller") {
    void notifySellerRegistered({
      id: data.user.id,
      storeName: fullName,
      sellerName: fullName,
      phone,
      email,
      status: "pending",
      createdAt: data.user.created_at,
    });
  } else {
    void notifyUserRegistered({
      id: data.user.id,
      fullName,
      phone,
      email,
      createdAt: data.user.created_at,
    });
  }

  if (serverEnv.hasSmtpConfig) {
    try {
      await sendWelcomeRegistrationEmail({
        to: email,
        fullName,
        role,
        loginUrl: new URL("/login", await getPublicRequestOrigin()).toString(),
      });
    } catch (error) {
      console.error("Welcome registration email failed", {
        message: error instanceof Error ? error.message : String(error),
        email,
        role,
      });
    }
  } else {
    console.warn("Welcome registration email skipped because SMTP is not configured");
  }

  if (role === "customer") {
    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return {
        ok: true,
        message: "Qeydiyyat tamamlandı. Avtomatik giriş alınmadı, giriş səhifəsindən daxil olun.",
        redirectTo: "/login",
      };
    }
  }

  return {
    ok: true,
    message:
      role === "seller"
        ? "Qeydiyyatınız uğurla tamamlandı. Sizinlə əlaqə saxlanılacaq."
        : "Qeydiyyat tamamlandı. Hesabınıza avtomatik giriş edildi.",
    redirectTo: role === "seller" ? "/login" : nextPath || "/",
  };
}

export async function loginAction(formData: FormData): Promise<AuthResult> {
  const identifier = normalizeIdentifier(readString(formData, "identifier"));
  const password = readString(formData, "password");
  const nextPath = normalizeNextPath(readString(formData, "next"));
  const mode = readString(formData, "mode") === "admin" ? "admin" : "public";
  const ip = await getClientIp();
  const userAgent = await getClientUserAgent();
  const rateLimitRule = {
    endpoint: "login" as const,
    identifier,
    ip,
    maxAttempts: 5,
    windowSeconds: 15 * 60,
    blockSeconds: 2 * 60,
  };

  if (!identifier || !password) {
    return {
      ok: false,
      message: "Email və şifrə mütləqdir.",
    };
  }

  if (password.length > 1024) {
    return {
      ok: false,
      message: GENERIC_LOGIN_ERROR,
    };
  }

  const rateLimit = await assertAuthRateLimit(rateLimitRule);

  if (!rateLimit.ok) {
    if (mode === "admin") {
      void notifyAdminLoginFailed({
        login: identifier,
        ip,
        userAgent,
        reason: "rate_limited",
      });
      void recordAdminAudit({
        action: "ADMIN_LOGIN_FAILED",
        success: false,
        metadata: {
          login: identifier,
          ip,
          user_agent: userAgent,
          reason: "rate_limited",
        },
      });
    }

    return {
      ok: false,
      message: rateLimit.message,
    };
  }

  const captchaToken = readCaptchaToken(formData);
  const captcha =
    mode === "admin" || !captchaToken
      ? { ok: true, message: "" }
      : await verifyCaptchaToken(captchaToken, ip);

  if (!captcha.ok) {
    if (mode === "admin") {
      void notifyAdminLoginFailed({
        login: identifier,
        ip,
        userAgent,
        reason: "captcha_failed",
      });
      void recordAdminAudit({
        action: "ADMIN_LOGIN_FAILED",
        success: false,
        metadata: {
          login: identifier,
          ip,
          user_agent: userAgent,
          reason: "captcha_failed",
        },
      });
    }

    return {
      ok: false,
      message: captcha.message,
    };
  }

  const supabase = await createSupabaseServerClient({
    authScope: mode === "admin" ? "admin" : "public",
  });
  const email = identifier;

  if (!isValidEmail(email)) {
    const message =
      mode === "admin"
        ? await recordAdminLoginFailure({
            rateLimitRule,
            login: identifier,
            ip,
            userAgent,
            reason: "invalid_email",
            fallbackMessage: "Düzgün email daxil edin.",
          })
        : await recordLoginFailure(rateLimitRule, "Düzgün email daxil edin.");

    return {
      ok: false,
      message,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const message =
      mode === "admin"
        ? await recordAdminLoginFailure({
            rateLimitRule,
            login: identifier,
            ip,
            userAgent,
            reason: "invalid_credentials",
          })
        : await recordLoginFailure(rateLimitRule);

    return {
      ok: false,
      message,
    };
  }

  if (!data.user) {
    const message =
      mode === "admin"
        ? await recordAdminLoginFailure({
            rateLimitRule,
            login: identifier,
            ip,
            userAgent,
            reason: "missing_user",
          })
        : await recordLoginFailure(rateLimitRule);

    return {
      ok: false,
      message,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,full_name")
    .eq("id", data.user.id)
    .returns<{ role: AuthRole; full_name: string | null }[]>()
    .maybeSingle();

  const role: AuthRole = profile?.role ?? "customer";
  const requestedRole =
    typeof data.user.user_metadata?.requested_role === "string"
      ? data.user.user_metadata.requested_role
      : null;
  const sellerApplicationStatus =
    typeof data.user.user_metadata?.seller_application_status === "string"
      ? data.user.user_metadata.seller_application_status
      : null;

  if (
    mode === "public" &&
    requestedRole === "seller" &&
    sellerApplicationStatus === "pending" &&
    role !== "seller"
  ) {
    await supabase.auth.signOut();

    return {
      ok: false,
      message: "Qeydiyyatınız uğurla tamamlandı. Sizinlə əlaqə saxlanılacaq.",
    };
  }

  if (
    mode === "public" &&
    requestedRole === "seller" &&
    sellerApplicationStatus === "rejected" &&
    role !== "seller"
  ) {
    await supabase.auth.signOut();

    return {
      ok: false,
      message: "Satıcı müraciətiniz hələ aktiv deyil.",
    };
  }

  if (mode === "admin" && role !== "admin") {
    await supabase.auth.signOut();
    const message = await recordAdminLoginFailure({
      rateLimitRule,
      login: identifier,
      ip,
      userAgent,
      reason: "role_not_admin",
    });

    return {
      ok: false,
      message,
    };
  }

  if (mode === "public" && role === "admin") {
    await supabase.auth.signOut();
    const message = await recordLoginFailure(rateLimitRule);

    return {
      ok: false,
      message,
    };
  }

  const systemFlags = await getSystemFlags();

  if (mode === "admin" && !systemFlags.admin_panel_enabled) {
    await supabase.auth.signOut();
    const message = await recordAdminLoginFailure({
      rateLimitRule,
      login: identifier,
      ip,
      userAgent,
      reason: "admin_panel_offline",
      fallbackMessage: "Admin panel hazırda deaktivdir.",
    });

    return {
      ok: false,
      message,
    };
  }

  if (mode === "public" && !systemFlags.site_enabled) {
    await supabase.auth.signOut();

    return {
      ok: false,
      message: "Sayt hazırda texniki xidmət rejimindədir.",
    };
  }

  if (mode === "public" && role === "seller" && !systemFlags.seller_panel_enabled) {
    await supabase.auth.signOut();

    return {
      ok: false,
      message: "Satıcı panellərinə giriş hazırda bağlıdır.",
    };
  }

  if (mode === "public" && role === "customer" && !systemFlags.user_access_enabled) {
    await supabase.auth.signOut();

    return {
      ok: false,
      message: "İstifadəçi girişləri hazırda bağlıdır.",
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

  if (role === "seller") {
    try {
      await ensureSellerStore({
        userId: data.user.id,
        name: profile?.full_name ?? data.user.user_metadata?.full_name ?? data.user.email,
      });
    } catch (storeError) {
      return {
        ok: false,
        message:
          storeError instanceof Error
            ? storeError.message
            : "Mağaza profili yaradıla bilmədi.",
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

  if (mode === "admin" && role === "admin") {
    void markAdminSessionActive({
      userId: data.user.id,
      ip,
      userAgent,
    });
    void recordAdminAudit({
      action: "ADMIN_LOGIN",
      adminId: data.user.id,
      metadata: {
        login: data.user.email ?? email,
        name: profile?.full_name ?? null,
        role,
        ip,
        user_agent: userAgent,
      },
    });
    void notifyAdminLogin({
      adminId: data.user.id,
      login: data.user.email ?? email,
      name: profile?.full_name,
      role,
      ip,
      userAgent,
    });
  }
  await resetAuthRateLimit({
    endpoint: "login",
    identifier,
    ip,
  });

  return {
    ok: true,
    message: "Giriş uğurludur.",
    redirectTo: nextPath || (mode === "admin" ? getDashboardPath(role) : "/"),
  };
}

export async function googleOAuthAction(formData: FormData): Promise<AuthResult> {
  const nextPath = normalizeNextPath(readString(formData, "next")) || "/";
  const mode = readString(formData, "mode") === "admin" ? "admin" : "public";
  const ip = await getClientIp();
  const systemFlags = await getSystemFlags();

  if (mode === "admin") {
    return {
      ok: false,
      message: "Google ilə giriş yalnız public hesablar üçün aktivdir.",
    };
  }

  if (!systemFlags.site_enabled || !systemFlags.user_access_enabled) {
    return {
      ok: false,
      message: !systemFlags.site_enabled
        ? "Sayt hazırda texniki xidmət rejimindədir."
        : "İstifadəçi girişləri hazırda bağlıdır.",
    };
  }

  const rateLimit = await assertAuthRateLimit({
    endpoint: "login",
    identifier: "google-oauth",
    ip,
    maxAttempts: 8,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      message: rateLimit.message,
    };
  }

  const captcha = await verifyCaptchaToken(readCaptchaToken(formData), ip);

  if (!captcha.ok) {
    return {
      ok: false,
      message: captcha.message,
    };
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = new URL("/auth/callback", clientEnv.appUrl);
  redirectTo.searchParams.set("next", nextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    return {
      ok: false,
      message: "Google ilə giriş başlatmaq mümkün olmadı. Yenidən cəhd edin.",
    };
  }

  return {
    ok: true,
    message: "Google girişinə yönləndirilirsiniz.",
    redirectTo: data.url,
  };
}

export async function logoutAction(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const { data: profile } = data.user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .returns<{ role: AuthRole }[]>()
        .maybeSingle()
    : { data: null };
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

  if (profile?.role === "admin") {
    void markAdminSessionInactive(data.user?.id);
  }

  return {
    ok: true,
    message: "Hesabdan çıxış edildi.",
    redirectTo: "/login",
  };
}

export async function requestPasswordResetAction(formData: FormData): Promise<AuthResult> {
  const identifier = normalizeIdentifier(readString(formData, "identifier"));

  if (!identifier) {
    return {
      ok: false,
      message: "Email daxil edin.",
    };
  }

  const email = identifier;

  if (!isValidEmail(email)) {
    return {
      ok: false,
      message: "Düzgün email daxil edin.",
    };
  }

  if (!serverEnv.hasSupabaseSecretKey) {
    console.error("Password reset account lookup requires Supabase service role key");

    return {
      ok: false,
      message: PASSWORD_RESET_CONFIG_ERROR,
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: resetProfile, error: resetProfileError } = await (supabaseAdmin as any)
    .from("profiles")
    .select("id,email")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (resetProfileError) {
    console.error("Password reset profile lookup failed", {
      message: resetProfileError.message,
      code: resetProfileError.code,
    });

    return {
      ok: false,
      message: PASSWORD_RESET_SEND_ERROR,
    };
  }

  if (!resetProfile?.id) {
    return {
      ok: false,
      message: PASSWORD_RESET_INACTIVE_ACCOUNT,
    };
  }

  let authUserResult: Awaited<ReturnType<typeof supabaseAdmin.auth.admin.getUserById>>;

  try {
    authUserResult = await withAuthTimeout(
      supabaseAdmin.auth.admin.getUserById(resetProfile.id),
      "İstifadəçi hesabının yoxlanması",
    );
  } catch (error) {
    console.error("Password reset auth user lookup timed out", {
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      message: PASSWORD_RESET_SEND_ERROR,
    };
  }

  const resetUser = authUserResult.data.user;
  const bannedUntil =
    typeof resetUser?.banned_until === "string" ? Date.parse(resetUser.banned_until) : null;
  const isAccountActive =
    !authUserResult.error &&
    Boolean(resetUser?.id) &&
    resetUser?.email?.toLowerCase() === email &&
    !resetUser.deleted_at &&
    !(bannedUntil && bannedUntil > Date.now());

  if (!isAccountActive) {
    return {
      ok: false,
      message: PASSWORD_RESET_INACTIVE_ACCOUNT,
    };
  }

  const redirectUrl = new URL("/auth/callback", await getPublicRequestOrigin());

  redirectUrl.searchParams.set("next", "/reset-password?mode=recovery");

  if (serverEnv.hasSmtpConfig) {
    console.info("Password reset email channel selected", { channel: "smtp" });
    let generateResult: Awaited<ReturnType<typeof supabaseAdmin.auth.admin.generateLink>>;

    try {
      generateResult = await withAuthTimeout(
        supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: redirectUrl.toString(),
          },
        }),
        "Bərpa linkinin yaradılması",
      );
    } catch (error) {
      console.error("Password reset link generation timed out", {
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        ok: false,
        message: PASSWORD_RESET_SEND_ERROR,
      };
    }

    const { data, error } = generateResult;

    if (error) {
      if (isMissingAuthUserError(error)) {
        return {
          ok: false,
          message: PASSWORD_RESET_INACTIVE_ACCOUNT,
        };
      }

      console.error("Password reset link generation failed", {
        message: error.message,
        status: error.status,
        code: error.code,
      });

      return {
        ok: false,
        message: PASSWORD_RESET_SEND_ERROR,
      };
    }

    const tokenHash = data.properties?.hashed_token;

    if (!tokenHash) {
      console.error("Password reset link generation returned no token hash");

      return {
        ok: false,
        message: PASSWORD_RESET_SEND_ERROR,
      };
    }

    const resetUrl = new URL("/auth/confirm", await getPublicRequestOrigin());
    resetUrl.searchParams.set("token_hash", tokenHash);
    resetUrl.searchParams.set("type", "recovery");
    resetUrl.searchParams.set("next", "/reset-password?mode=recovery");

    try {
      await sendPasswordResetEmail({ to: email, resetUrl: resetUrl.toString() });
    } catch (error) {
      console.error("Password reset SMTP email failed", {
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        ok: false,
        message: PASSWORD_RESET_SEND_ERROR,
      };
    }
  } else {
    console.info("Password reset email channel selected", { channel: "supabase" });
    const supabase = await createSupabaseServerClient();
    let resetResult: Awaited<ReturnType<typeof supabase.auth.resetPasswordForEmail>>;

    try {
      resetResult = await withAuthTimeout(
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl.toString(),
        }),
        "Bərpa emailinin göndərilməsi",
      );
    } catch (error) {
      console.error("Password reset email timed out", {
        channel: "supabase",
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        ok: false,
        message: PASSWORD_RESET_SEND_ERROR,
      };
    }

    const { error } = resetResult;

    if (error) {
      console.error("Password reset email failed", {
        message: error.message,
        status: error.status,
        code: error.code,
      });

      return {
        ok: false,
        message: PASSWORD_RESET_SEND_ERROR,
      };
    }
  }

  return {
    ok: true,
    message: GENERIC_RESET_RESPONSE,
    redirectTo: "/login",
  };
}

export async function updatePasswordAction(formData: FormData): Promise<AuthResult> {
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");

  if (!password || !confirmPassword) {
    return {
      ok: false,
      message: "Şifrə və təkrar şifrə mütləqdir.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      message: "Şifrələr uyğun gəlmir.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      message: "Şifrə minimum 8 simvol olmalıdır.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      ok: false,
      message: "Şifrə təhlükəsizlik tələblərinə uyğun deyil.",
    };
  }

  return {
    ok: true,
    message: "Şifrə uğurla yeniləndi.",
    redirectTo: "/login",
  };
}

export async function updateCustomerProfileAction(formData: FormData): Promise<AuthResult> {
  const current = await requireRole(["customer", "seller"], "/dashboard/profile");
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
  await trackActivityEvent({
    eventType: "profile_updated",
    actorId: current.user.id,
    metadata: {
      title: "Profil yeniləndi",
      description: "Email, telefon və profil məlumatları dəyişdirildi.",
      email,
    },
  });

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
  const role = action === "approve" ? "seller" : action === "reject" ? "customer" : selectedRole;

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
  const isSellerApplication =
    existingMeta.requested_role === "seller" &&
    existingMeta.seller_application_status === "pending";

  if ((action === "approve" || action === "reject") && !isSellerApplication) {
    return {
      ok: false,
      message: "Gözləyən satıcı müraciəti tapılmadı.",
    };
  }

  const { role: _ignoredMetadataRole, ...safeExistingMeta } = existingMeta as Record<
    string,
    unknown
  >;
  void _ignoredMetadataRole;
  const mergedMetadata = {
    ...safeExistingMeta,
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

  if (role === "seller") {
    try {
      const fullName =
        typeof existingMeta.full_name === "string" && existingMeta.full_name.trim()
          ? existingMeta.full_name
          : existingUser?.user?.email ?? "Yeni mağaza";

      await ensureSellerStore({
        userId,
        name: fullName,
      });
    } catch (storeError) {
      return {
        ok: false,
        message:
          storeError instanceof Error
            ? storeError.message
            : "Satıcı mağazası yaradıla bilmədi.",
      };
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/radmin/users");
  revalidatePath("/store/dashboard", "layout");

  return {
    ok: true,
    message: "İstifadəçi rolu yeniləndi.",
  };
}

type AdminUserMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

async function revokeProfileSessions(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  await (supabaseAdmin as any)
    .from("profiles")
    .update({ session_revoked_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function updateUserContactByAdminAction(
  formData: FormData,
): Promise<AdminUserMutationResult> {
  const current = await requireRole(["admin"], "/radmin/users");
  const userId = readString(formData, "userId");
  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email").toLowerCase();
  const phone = normalizeAzerbaijanPhone(readString(formData, "phone"));

  if (!userId) {
    return { ok: false, message: "İstifadəçi tapılmadı." };
  }

  if (!fullName || !email || !phone) {
    return { ok: false, message: "Ad soyad, email və telefon mütləqdir." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: "Düzgün email daxil edin." };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existingUser, error: getUserError } =
    await supabaseAdmin.auth.admin.getUserById(userId);

  if (getUserError || !existingUser.user) {
    return { ok: false, message: "İstifadəçi tapılmadı." };
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email,
    user_metadata: {
      ...(existingUser.user.user_metadata ?? {}),
      full_name: fullName,
      phone,
    },
  });

  if (authError) {
    return {
      ok: false,
      message:
        authError.message.toLowerCase().includes("already")
          ? "Bu email ilə hesab artıq mövcuddur."
          : "İstifadəçi məlumatları yenilənmədi.",
    };
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: fullName,
      email,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  void recordAdminAudit({
    action: "ADMIN_USER_CONTACT_UPDATE",
    adminId: current.user.id,
    entityType: "user",
    entityId: userId,
    metadata: {
      fullName,
      email,
      phone,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/radmin/users");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/store/dashboard", "layout");

  return { ok: true, message: "Ad, email və telefon yeniləndi." };
}

export async function deactivateUserAction(
  formData: FormData,
): Promise<AdminUserMutationResult> {
  const current = await requireRole(["admin"], "/radmin/users");
  const userId = readString(formData, "userId");

  if (!userId) {
    return { ok: false, message: "İstifadəçi tapılmadı." };
  }

  if (current.user.id === userId) {
    return { ok: false, message: "Öz admin hesabınızı deaktiv etmək olmaz." };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  await revokeProfileSessions(userId);
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });

  if (error) {
    void recordAdminAudit({
      action: "ADMIN_USER_DEACTIVATE",
      adminId: current.user.id,
      entityType: "user",
      entityId: userId,
      success: false,
      metadata: { reason: error.message },
    });

    return { ok: false, message: "İstifadəçi deaktiv edilmədi." };
  }

  void recordAdminAudit({
    action: "ADMIN_USER_DEACTIVATE",
    adminId: current.user.id,
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath("/radmin/users");

  return { ok: true, message: "İstifadəçi deaktiv edildi." };
}

export async function activateUserAction(
  formData: FormData,
): Promise<AdminUserMutationResult> {
  const current = await requireRole(["admin"], "/radmin/users");
  const userId = readString(formData, "userId");

  if (!userId) {
    return { ok: false, message: "İstifadəçi tapılmadı." };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  if (error) {
    return { ok: false, message: "İstifadəçi aktiv edilmədi." };
  }

  void recordAdminAudit({
    action: "ADMIN_USER_ACTIVATE",
    adminId: current.user.id,
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath("/radmin/users");

  return { ok: true, message: "İstifadəçi aktiv edildi." };
}

export async function deleteUserAction(
  formData: FormData,
): Promise<AdminUserMutationResult> {
  const current = await requireRole(["admin"], "/radmin/users");
  const userId = readString(formData, "userId");

  if (!userId) {
    return { ok: false, message: "İstifadəçi tapılmadı." };
  }

  if (current.user.id === userId) {
    return { ok: false, message: "Öz admin hesabınızı silmək olmaz." };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    void recordAdminAudit({
      action: "ADMIN_USER_DELETE",
      adminId: current.user.id,
      entityType: "user",
      entityId: userId,
      success: false,
      metadata: { reason: error.message },
    });

    return { ok: false, message: "İstifadəçi silinmədi." };
  }

  void recordAdminAudit({
    action: "ADMIN_USER_DELETE",
    adminId: current.user.id,
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath("/radmin/users");

  return { ok: true, message: "İstifadəçi silindi." };
}

export async function updateUserPasswordByAdminAction(
  formData: FormData,
): Promise<AdminUserMutationResult> {
  const current = await requireRole(["admin"], "/radmin/users");
  const userId = readString(formData, "userId");
  const password = readString(formData, "password");

  if (!userId) {
    return { ok: false, message: "İstifadəçi tapılmadı." };
  }

  if (password.length < 8) {
    return { ok: false, message: "Şifrə minimum 8 simvol olmalıdır." };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    return { ok: false, message: "Şifrə yenilənmədi." };
  }

  await revokeProfileSessions(userId);
  void recordAdminAudit({
    action: "ADMIN_USER_PASSWORD_UPDATE",
    adminId: current.user.id,
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath("/radmin/users");

  return { ok: true, message: "İstifadəçi şifrəsi yeniləndi." };
}

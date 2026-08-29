import { clientEnv } from "@/lib/config/env.client";

function readOptionalServerEnv(name: string) {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables cannot be read in the browser.");
  }

  return process.env[name] || "";
}

export const serverEnv = {
  ...clientEnv,
  get supabaseSecretKey() {
    return (
      readOptionalServerEnv("SUPABASE_SECRET_KEY") ||
      readOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
  },
  get hasSupabaseSecretKey() {
    return Boolean(
      readOptionalServerEnv("SUPABASE_SECRET_KEY") ||
        readOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    );
  },
  get r2AccountId() {
    return readOptionalServerEnv("R2_ACCOUNT_ID");
  },
  get r2AccessKeyId() {
    return readOptionalServerEnv("R2_ACCESS_KEY_ID");
  },
  get r2SecretAccessKey() {
    return readOptionalServerEnv("R2_SECRET_ACCESS_KEY");
  },
  get r2BucketName() {
    return readOptionalServerEnv("R2_BUCKET_NAME");
  },
  get r2PublicUrl() {
    return readOptionalServerEnv("R2_PUBLIC_URL");
  },
  get hasR2Config() {
    return Boolean(
      readOptionalServerEnv("R2_ACCOUNT_ID") &&
        readOptionalServerEnv("R2_ACCESS_KEY_ID") &&
        readOptionalServerEnv("R2_SECRET_ACCESS_KEY") &&
        readOptionalServerEnv("R2_BUCKET_NAME") &&
        readOptionalServerEnv("R2_PUBLIC_URL"),
    );
  },
  get turnstileSecretKey() {
    if (typeof window !== "undefined") {
      throw new Error("Server environment variables cannot be read in the browser.");
    }

    return process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  },
  get hasTurnstileConfig() {
    if (typeof window !== "undefined") {
      throw new Error("Server environment variables cannot be read in the browser.");
    }

    return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
  },
  get smtpHost() {
    return readOptionalServerEnv("SMTP_HOST").trim();
  },
  get smtpPort() {
    const value = Number.parseInt(readOptionalServerEnv("SMTP_PORT"), 10);

    return Number.isFinite(value) && value > 0 ? value : 587;
  },
  get smtpSecure() {
    return readOptionalServerEnv("SMTP_SECURE").trim().toLowerCase() === "true";
  },
  get smtpUser() {
    return readOptionalServerEnv("SMTP_USER").trim();
  },
  get smtpPassword() {
    return readOptionalServerEnv("SMTP_PASSWORD");
  },
  get smtpFrom() {
    return readOptionalServerEnv("SMTP_FROM").trim();
  },
  get hasSmtpConfig() {
    return Boolean(
      readOptionalServerEnv("SMTP_HOST").trim() &&
        readOptionalServerEnv("SMTP_USER").trim() &&
        readOptionalServerEnv("SMTP_PASSWORD"),
    );
  },
  get telegramBotToken() {
    return readOptionalServerEnv("TELEGRAM_BOT_TOKEN").trim();
  },
  get telegramAdminChatId() {
    return (
      readOptionalServerEnv("TELEGRAM_ADMIN_CHAT_ID").trim() ||
      readOptionalServerEnv("TELEGRAM_CHAT_ID").trim()
    );
  },
  get telegramAdminUserId() {
    return readOptionalServerEnv("TELEGRAM_ADMIN_USER_ID").trim();
  },
  get telegramWebhookSecret() {
    return readOptionalServerEnv("TELEGRAM_WEBHOOK_SECRET").trim();
  },
  get telegramAdminPasswordHash() {
    return readOptionalServerEnv("TELEGRAM_ADMIN_PASSWORD_HASH").trim();
  },
  get telegramAdminUnlockCodeHash() {
    return readOptionalServerEnv("TELEGRAM_ADMIN_UNLOCK_CODE_HASH").trim();
  },
  get hasTelegramConfig() {
    return Boolean(
      readOptionalServerEnv("TELEGRAM_BOT_TOKEN").trim() &&
        (readOptionalServerEnv("TELEGRAM_ADMIN_CHAT_ID").trim() ||
          readOptionalServerEnv("TELEGRAM_CHAT_ID").trim()) &&
        readOptionalServerEnv("TELEGRAM_ADMIN_USER_ID").trim(),
    );
  },
} as const;

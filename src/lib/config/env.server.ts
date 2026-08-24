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

    return process.env.TURNSTILE_SECRET_KEY ?? "";
  },
  get hasTurnstileConfig() {
    if (typeof window !== "undefined") {
      throw new Error("Server environment variables cannot be read in the browser.");
    }

    return Boolean(process.env.TURNSTILE_SECRET_KEY);
  },
} as const;

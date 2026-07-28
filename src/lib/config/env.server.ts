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
      readOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY") ||
      clientEnv.supabasePublishableKey
    );
  },
  get hasSupabaseSecretKey() {
    return Boolean(
      readOptionalServerEnv("SUPABASE_SECRET_KEY") ||
        readOptionalServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    );
  },
} as const;

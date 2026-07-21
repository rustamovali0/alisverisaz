import { clientEnv } from "@/lib/config/env.client";

function readRequiredServerEnv(name: string) {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables cannot be read in the browser.");
  }

  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

export const serverEnv = {
  ...clientEnv,
  supabaseSecretKey: readRequiredServerEnv("SUPABASE_SECRET_KEY"),
} as const;

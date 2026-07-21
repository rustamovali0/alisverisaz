function readRequiredPublicEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const clientEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseProjectId: readRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_PROJECT_ID"),
  supabaseUrl: readRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: readRequiredPublicEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ),
} as const;

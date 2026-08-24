function requirePublicEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readSupabaseProjectId(supabaseUrl: string) {
  const explicitProjectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;

  if (explicitProjectId) {
    return explicitProjectId;
  }

  try {
    const host = new URL(supabaseUrl).hostname;
    const [projectId] = host.split(".");

    if (projectId) {
      return projectId;
    }
  } catch {
    // The URL is validated by the Supabase client when it is used.
  }

  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_PROJECT_ID",
  );
}

const supabaseUrl = requirePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);
const supabasePublishableKey = requirePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);

export const clientEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  storeRootDomain:
    process.env.NEXT_PUBLIC_STORE_ROOT_DOMAIN?.trim() || "alisveris.az",
  supabaseProjectId: readSupabaseProjectId(supabaseUrl),
  supabaseUrl,
  supabasePublishableKey,
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "",
} as const;

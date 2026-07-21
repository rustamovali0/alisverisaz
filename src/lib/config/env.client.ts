function readRequiredPublicEnv(name: string) {
  const value = process.env[name];

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

const supabaseUrl = readRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL");

export const clientEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseProjectId: readSupabaseProjectId(supabaseUrl),
  supabaseUrl,
  supabasePublishableKey: readRequiredPublicEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ),
} as const;

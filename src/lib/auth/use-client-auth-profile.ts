"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isAuthRole, type AuthRole } from "@/lib/auth/types";

export type ClientAuthProfile =
  | {
      status: "loading" | "guest";
      role: null;
      email: null;
      fullName: null;
      avatarUrl: null;
    }
  | {
      status: "authenticated";
      role: AuthRole;
      email: string | null;
      fullName: string | null;
      avatarUrl: string | null;
    };

export type ClientAuthProfileState = {
  profile: ClientAuthProfile;
  /** True once the browser has checked the current Supabase session. */
  isResolved: boolean;
};

const AUTH_PROFILE_RESET_EVENT = "alisveris-auth-profile-reset";
const AUTH_PROFILE_CACHE_KEY = "alisveris-auth-profile-cache-v1";
let inMemoryProfile: ClientAuthProfile | null = null;

const emptyProfile: ClientAuthProfile = {
  status: "loading",
  role: null,
  email: null,
  fullName: null,
  avatarUrl: null,
};

function isCachedProfile(value: unknown): value is ClientAuthProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;

  if (profile.status === "guest") {
    return profile.role === null;
  }

  return profile.status === "authenticated" && isAuthRole(profile.role);
}

function readCachedProfile() {
  if (inMemoryProfile) {
    return inMemoryProfile;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cached = JSON.parse(window.localStorage.getItem(AUTH_PROFILE_CACHE_KEY) ?? "null");

    if (isCachedProfile(cached)) {
      inMemoryProfile = cached;
      return cached;
    }
  } catch {
    // The server-side route check remains the source of authorization truth.
  }

  return null;
}

function cacheProfile(profile: ClientAuthProfile) {
  inMemoryProfile = profile;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch {
      // Keep the in-memory value when storage is unavailable.
    }
  }
}

function normalizeRole(role: unknown): AuthRole {
  return isAuthRole(role) ? role : "customer";
}

async function loadClientAuthProfile(): Promise<ClientAuthProfile> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "guest",
      role: null,
      email: null,
      fullName: null,
      avatarUrl: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,email,full_name,avatar_url")
    .eq("id", user.id)
    .returns<
      Array<{
        role: AuthRole | null;
        email: string | null;
        full_name: string | null;
        avatar_url: string | null;
      }>
    >()
    .maybeSingle();

  return {
    status: "authenticated",
    role: normalizeRole(profile?.role),
    email: profile?.email ?? user.email ?? null,
    fullName:
      profile?.full_name ??
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null),
    avatarUrl:
      profile?.avatar_url ??
      (typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null),
  };
}

export function clearClientAuthProfileCache() {
  inMemoryProfile = null;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
    } catch {
      // ignore storage failures
    }
    window.dispatchEvent(new Event(AUTH_PROFILE_RESET_EVENT));
  }
}

export function useClientAuthProfileState(): ClientAuthProfileState {
  const [profile, setProfile] = useState<ClientAuthProfile>(
    () => readCachedProfile() ?? emptyProfile,
  );
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    async function refreshProfile() {
      const nextProfile = await loadClientAuthProfile();

      if (isMounted) {
        cacheProfile(nextProfile);
        setProfile(nextProfile);
        setIsResolved(true);
      }
    }

    void refreshProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        const guestProfile: ClientAuthProfile = {
          status: "guest",
          role: null,
          email: null,
          fullName: null,
          avatarUrl: null,
        };

        cacheProfile(guestProfile);
        setProfile(guestProfile);
        setIsResolved(true);
        return;
      }

      setIsResolved(false);
      void refreshProfile();
    });

    window.addEventListener(AUTH_PROFILE_RESET_EVENT, refreshProfile);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener(AUTH_PROFILE_RESET_EVENT, refreshProfile);
    };
  }, []);

  return { profile, isResolved };
}

export function useClientAuthProfile() {
  return useClientAuthProfileState().profile;
}

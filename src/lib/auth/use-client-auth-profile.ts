"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isAuthRole, type AuthRole } from "@/lib/auth/types";

export type ClientAuthProfile =
  | {
      status: "loading" | "guest";
      userId: null;
      role: null;
      email: null;
      fullName: null;
      avatarUrl: null;
    }
  | {
      status: "authenticated";
      userId: string;
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

const AUTH_PROFILE_CACHE_KEY = "alisveris-auth-profile-cache-v2";
let inMemoryProfile: ClientAuthProfile | null = null;
let didReadInitialCache = false;
let currentProfile: ClientAuthProfile | null = null;
let currentIsResolved = false;
let authProfilePromise: Promise<ClientAuthProfile> | null = null;
let authProfileVersion = 0;
let authWatcherStarted = false;
const profileListeners = new Set<(state: ClientAuthProfileState) => void>();

const emptyProfile: ClientAuthProfile = {
  status: "loading",
  userId: null,
  role: null,
  email: null,
  fullName: null,
  avatarUrl: null,
};

const guestProfile: ClientAuthProfile = {
  status: "guest",
  userId: null,
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
    return profile.userId === null && profile.role === null;
  }

  return (
    profile.status === "authenticated" &&
    typeof profile.userId === "string" &&
    isAuthRole(profile.role)
  );
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
    return guestProfile;
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
    userId: user.id,
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

function getCurrentProfile() {
  if (!didReadInitialCache) {
    currentProfile = readCachedProfile() ?? emptyProfile;
    didReadInitialCache = true;
  }

  return currentProfile ?? emptyProfile;
}

function getSnapshot(): ClientAuthProfileState {
  return {
    profile: getCurrentProfile(),
    isResolved: currentIsResolved,
  };
}

function publishAuthProfile(profile: ClientAuthProfile, isResolved: boolean) {
  currentProfile = profile;
  currentIsResolved = isResolved;

  const snapshot = getSnapshot();
  profileListeners.forEach((listener) => listener(snapshot));
}

function cacheAndPublishAuthProfile(profile: ClientAuthProfile, isResolved = true) {
  cacheProfile(profile);
  publishAuthProfile(profile, isResolved);
}

export function refreshClientAuthProfile() {
  if (authProfilePromise) {
    return authProfilePromise;
  }

  const requestVersion = authProfileVersion;
  const nextPromise = loadClientAuthProfile()
    .then((nextProfile) => {
      if (requestVersion === authProfileVersion) {
        cacheAndPublishAuthProfile(nextProfile, true);
        return nextProfile;
      }

      return getCurrentProfile();
    })
    .catch(() => {
      const fallbackProfile = readCachedProfile() ?? guestProfile;
      if (requestVersion === authProfileVersion) {
        publishAuthProfile(fallbackProfile, true);
      }

      return fallbackProfile;
    })
    .finally(() => {
      if (authProfilePromise === nextPromise) {
        authProfilePromise = null;
      }
    });

  authProfilePromise = nextPromise;

  return nextPromise;
}

function reloadClientAuthProfile() {
  authProfileVersion += 1;
  authProfilePromise = null;
  return refreshClientAuthProfile();
}

function clearPersistedAuthProfile() {
  inMemoryProfile = null;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
    } catch {
      // ignore storage failures
    }
  }
}

function setGuestProfile() {
  authProfileVersion += 1;
  authProfilePromise = null;
  cacheAndPublishAuthProfile(guestProfile, true);
}

export function refreshCachedClientAuthProfile() {
  clearPersistedAuthProfile();
  publishAuthProfile(emptyProfile, false);
  return reloadClientAuthProfile();
}

function refreshProfileAfterSessionChange() {
  publishAuthProfile(getCurrentProfile(), false);
  void reloadClientAuthProfile();
}

export async function getClientAuthProfileOnce() {
  ensureAuthProfileLoaded();

  const snapshot = getSnapshot();

  if (snapshot.isResolved && snapshot.profile.status !== "loading") {
    return snapshot.profile;
  }

  return refreshClientAuthProfile();
}

export function clearClientAuthProfileCache() {
  clearPersistedAuthProfile();
  currentProfile = emptyProfile;
  currentIsResolved = false;
  publishAuthProfile(emptyProfile, false);
  void reloadClientAuthProfile();
}

function ensureAuthProfileWatcher() {
  if (typeof window === "undefined" || authWatcherStarted) {
    return;
  }

  authWatcherStarted = true;
  const supabase = createSupabaseBrowserClient();

  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      setGuestProfile();
      return;
    }

    refreshProfileAfterSessionChange();
  });
}

function ensureAuthProfileLoaded() {
  ensureAuthProfileWatcher();

  if (!currentIsResolved && !authProfilePromise) {
    void refreshClientAuthProfile();
  }
}

export function useClientAuthProfileState(): ClientAuthProfileState {
  const [state, setState] = useState<ClientAuthProfileState>(() => getSnapshot());

  useEffect(() => {
    ensureAuthProfileLoaded();
    setState(getSnapshot());
    profileListeners.add(setState);

    return () => {
      profileListeners.delete(setState);
    };
  }, []);

  return state;
}

export function useClientAuthProfile() {
  return useClientAuthProfileState().profile;
}

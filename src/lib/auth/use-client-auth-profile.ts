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

const AUTH_PROFILE_CACHE_KEY = "alisveris-auth-profile-cache-v3";
let inMemoryProfile: ClientAuthProfile | null = null;
let didReadInitialCache = false;
let currentProfile: ClientAuthProfile | null = null;
let currentIsResolved = false;
let authProfilePromise: Promise<ClientAuthProfile> | null = null;
let authProfileVersion = 0;
let authWatcherStarted = false;
let hasHydratedClientAuthProfile = false;
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

async function loadClientAuthProfile(): Promise<ClientAuthProfile> {
  const response = await fetch("/api/auth/session?scope=public&profile=1", {
    credentials: "same-origin",
    cache: "no-cache",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Session verification failed");
  const data = await response.json();
  if (!data.authenticated) return guestProfile;
  if (!isCachedProfile(data.profile) ||
      data.profile.status !== "authenticated") {
    throw new Error("Invalid session profile");
  }
  return data.profile;
}

function getCurrentProfile() {
  if (!hasHydratedClientAuthProfile) {
    return emptyProfile;
  }

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

  supabase.auth.onAuthStateChange(() => {
    // Browser auth events are hints; server cookies determine the actual session.
    setTimeout(refreshProfileAfterSessionChange, 0);
  });
  window.addEventListener("focus", refreshProfileAfterSessionChange);
}

function ensureAuthProfileLoaded() {
  ensureAuthProfileWatcher();

  if (!hasHydratedClientAuthProfile) {
    hasHydratedClientAuthProfile = true;
    currentProfile = readCachedProfile() ?? emptyProfile;
    didReadInitialCache = true;
  }

  if (!currentIsResolved && !authProfilePromise) {
    void refreshClientAuthProfile();
  }
}

export function useClientAuthProfileState(): ClientAuthProfileState {
  // Suspense siblings may hydrate after another consumer has already filled the cache.
  // Every component must still start from the same snapshot it rendered on the server.
  const [state, setState] = useState<ClientAuthProfileState>({
    profile: emptyProfile,
    isResolved: false,
  });

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

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
      storeSlug?: string | null;
    };

export type ClientAuthProfileState = {
  profile: ClientAuthProfile;
  /** True once the browser has checked the current Supabase session. */
  isResolved: boolean;
};

export const VERIFIED_CLIENT_LOGOUT_EVENT = "alisveris-verified-session-ended";

const AUTH_PROFILE_CACHE_KEY = "alisveris-auth-profile-cache-v3";
let inMemoryProfile: ClientAuthProfile | null = null;
let didReadInitialCache = false;
let currentProfile: ClientAuthProfile | null = null;
let currentIsResolved = false;
let authProfilePromise: Promise<ClientAuthProfile> | null = null;
let authProfileVersion = 0;
let authWatcherStarted = false;
let lastProfileCheckAt = 0;
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
        lastProfileCheckAt = Date.now();
        cacheAndPublishAuthProfile(nextProfile, true);
        if (nextProfile.status === "guest" && typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
          // Only a successful server-cookie verification may end a private UI.
          // Cached guest values and network failures must not cause redirect loops.
          window.dispatchEvent(new Event(VERIFIED_CLIENT_LOGOUT_EVENT));
        }
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

/** Only use a profile returned by this site's cookie-verification endpoint. */
export function acceptVerifiedClientAuthProfile(value: unknown) {
  if (!isCachedProfile(value) || value.status !== "authenticated") return false;
  authProfileVersion += 1;
  authProfilePromise = null;
  lastProfileCheckAt = Date.now();
  cacheAndPublishAuthProfile(value, true);
  return true;
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

  supabase.auth.onAuthStateChange((event) => {
    // Hydration already verifies server cookies. INITIAL_SESSION must not cancel
    // that request and start a second identical verification.
    if (event === "INITIAL_SESSION") return;
    // Browser events are hints; authorization still comes from the server.
    setTimeout(refreshProfileAfterSessionChange, 0);
  });
  const syncAcrossTabs = (event: StorageEvent) => {
    if (event.key === AUTH_PROFILE_CACHE_KEY || event.key === null) {
      inMemoryProfile = null;
      didReadInitialCache = false;
      void reloadClientAuthProfile();
    }
  };
  const refreshWhenActive = () => {
    // focus and visibilitychange normally arrive together. Share in-flight work
    // and avoid another request immediately after a successful cookie check.
    if (!authProfilePromise && Date.now() - lastProfileCheckAt > 5_000) {
      void refreshClientAuthProfile();
    }
  };
  const syncWhenVisible = () => {
    if (document.visibilityState === "visible") refreshWhenActive();
  };
  window.addEventListener("storage", syncAcrossTabs);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", syncWhenVisible);
  }
  window.addEventListener("focus", refreshWhenActive);
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

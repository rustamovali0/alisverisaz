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

const AUTH_PROFILE_RESET_EVENT = "alisveris-auth-profile-reset";

const emptyProfile: ClientAuthProfile = {
  status: "loading",
  role: null,
  email: null,
  fullName: null,
  avatarUrl: null,
};

function normalizeRole(email: string | null | undefined, role: unknown): AuthRole {
  if (email?.toLowerCase() === "rustamovali664@gmail.com" || role === "admin") {
    return "admin";
  }

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
    role: normalizeRole(user.email, profile?.role ?? user.user_metadata?.role),
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_PROFILE_RESET_EVENT));
  }
}

export function useClientAuthProfile() {
  const [profile, setProfile] = useState<ClientAuthProfile>(emptyProfile);

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    async function refreshProfile() {
      const nextProfile = await loadClientAuthProfile();

      if (isMounted) {
        setProfile(nextProfile);
      }
    }

    void refreshProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshProfile();
    });

    window.addEventListener(AUTH_PROFILE_RESET_EVENT, refreshProfile);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener(AUTH_PROFILE_RESET_EVENT, refreshProfile);
    };
  }, []);

  return profile;
}

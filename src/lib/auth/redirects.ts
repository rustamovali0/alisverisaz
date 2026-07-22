import type { AuthRole } from "@/lib/auth/types";

export function getDashboardPath(role: AuthRole) {
  if (role === "admin") {
    return "/radmin";
  }

  if (role === "seller") {
    return "/admin";
  }

  return "/dashboard";
}

export function getLoginPath(next?: string) {
  const params = new URLSearchParams();

  if (next) {
    params.set("next", next);
  }

  const query = params.toString();

  return query ? `/login?${query}` : "/login";
}

export function getAdminLoginPath(next?: string) {
  const params = new URLSearchParams();

  if (next) {
    params.set("next", next);
  }

  const query = params.toString();

  return query ? `/radmin/login?${query}` : "/radmin/login";
}

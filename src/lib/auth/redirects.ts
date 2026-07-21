import type { AuthRole } from "@/lib/auth/types";

export function getDashboardPath(role: AuthRole) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "seller") {
    return "/store/dashboard";
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

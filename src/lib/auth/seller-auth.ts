import { requireRole } from "@/lib/auth/session";

export function requireSeller(nextPath = "/admin") {
  return requireRole(["seller"], nextPath);
}

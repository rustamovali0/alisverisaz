import { requireRole } from "@/lib/auth/session";

export function requireSeller(nextPath = "/store/dashboard") {
  return requireRole(["seller"], nextPath);
}

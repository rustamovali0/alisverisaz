import { requireRole } from "@/lib/auth/session";

export function requireRadmin(nextPath = "/radmin") {
  return requireRole(["admin"], nextPath);
}

import { assertAdminMfa } from "@/lib/security/admin-mfa";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/session";

export async function requireRadmin() {
  const current = await getCurrentUserProfile("admin");

  if (!current || current.role !== "admin") {
    redirect("/radmin/login");
  }

  await assertAdminMfa();
  return current;
}

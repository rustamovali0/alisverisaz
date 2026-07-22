import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/session";

export async function requireRadmin() {
  const current = await getCurrentUserProfile();

  if (!current || current.role !== "admin") {
    redirect("/radmin/login");
  }

  return current;
}

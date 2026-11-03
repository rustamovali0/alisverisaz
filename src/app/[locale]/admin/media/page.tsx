import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
export const dynamic = "force-dynamic";
export default async function AdminMediaPage() {
  await requireRole(["admin"], "/radmin/panel");
  redirect("/radmin/panel");
}

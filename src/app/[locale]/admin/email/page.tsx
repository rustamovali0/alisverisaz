import { AdminEmailCenter } from "@/components/admin/email/email-center";
import { loadEmailCenter } from "@/lib/email/admin";

export const dynamic = "force-dynamic";
export default async function EmailCenterPage() {
  return <AdminEmailCenter initial={await loadEmailCenter()} />;
}

import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CustomerSecurityPage() {
  await requireRole(["customer", "seller"], "/dashboard/security");
  const t = await getTranslations("customerAccount");

  return (
    <DashboardPanel
      title={t("security")}
      description={t("securityDescription")}
    >
      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black">Hesab qorunması</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Şifrə yeniləmə bölməsi Profil səhifəsinə köçürüldü. Giriş məlumatlarınızı
              yeniləmək üçün Profil bölməsindən istifadə edin.
            </p>
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}

"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { clearHeaderAccountCache } from "@/components/auth/header-account-actions";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const result = await logoutAction();

      if (!result.ok) {
        void appAlert.error(result.message, "Çıxış alınmadı");
        return;
      }

      void appAlert.success("Çıxış edildi", result.message);
      clearHeaderAccountCache();
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      disabled={isPending}
    >
      <LogOut className="mr-2 size-4" aria-hidden="true" />
      {isPending ? "Çıxılır" : "Çıxış"}
    </Button>
  );
}

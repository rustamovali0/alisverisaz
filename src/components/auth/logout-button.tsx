"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { clearHeaderAccountCache } from "@/components/auth/header-account-actions";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  compact?: boolean;
  className?: string;
};

export function LogoutButton({ compact = false, className }: LogoutButtonProps) {
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
      size={compact ? "icon" : "default"}
      className={cn(compact ? "size-10 rounded-xl" : undefined, className)}
      aria-label={compact ? "Çıxış" : undefined}
    >
      <LogOut className={compact ? "size-6 stroke-[2.5]" : "mr-2 size-4"} aria-hidden="true" />
      {compact ? null : isPending ? "Çıxılır" : "Çıxış"}
    </Button>
  );
}

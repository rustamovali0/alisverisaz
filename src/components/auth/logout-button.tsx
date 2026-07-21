"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/swal";
import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const result = await logoutAction();

      if (!result.ok) {
        await appAlert.error(result.message, "Çıxış alınmadı");
        return;
      }

      await appAlert.success("Çıxış edildi", result.message);
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

"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { refreshStorageUsage } from "@/lib/admin/storage/actions";
import { appAlert } from "@/lib/alerts/app-alert";
import { useRouter } from "@/i18n/navigation";
export function StorageRefresh() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await refreshStorageUsage();
          if (!result.ok) {
            void appAlert.error(result.message, "Yenilənmədi");
            return;
          }
          router.refresh();
        })
      }
    >
      {pending ? "Ölçülür..." : "Yenilə"}
    </Button>
  );
}

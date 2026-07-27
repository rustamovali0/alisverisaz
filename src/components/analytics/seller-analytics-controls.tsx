"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { deleteSellerAnalyticsAction } from "@/lib/analytics/actions";
import type { AnalyticsRange } from "@/lib/analytics/ranges";

type DeleteScope = "all" | "product_views" | "store_views" | "link_views";

export function SellerAnalyticsControls({
  range,
  hasData,
}: {
  range: AnalyticsRange;
  hasData: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(scope: DeleteScope) {
    startTransition(async () => {
      const confirmed = await appAlert.confirm({
        title: "Bütün fəaliyyət məlumatları silinsin?",
        message:
          "Bu əməliyyat seçilmiş fəaliyyət və statistika qeydlərini siləcək. Əməliyyatı geri qaytarmaq mümkün olmaya bilər.",
        confirmText: "Hamısını sil",
        cancelText: "Ləğv et",
        variant: "danger",
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      const result = await deleteSellerAnalyticsAction({ scope, range });

      if (!result.ok) {
        void appAlert.error(result.message);
        return;
      }

      void appAlert.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="destructive"
        disabled={!hasData || isPending}
        onClick={() => handleDelete("all")}
      >
        <Trash2 className="mr-2 size-4" />
        Hamısını sil
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!hasData || isPending}
        onClick={() => handleDelete("product_views")}
      >
        Məhsul baxışlarını sil
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!hasData || isPending}
        onClick={() => handleDelete("store_views")}
      >
        Mağaza ziyarətlərini sil
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!hasData || isPending}
        onClick={() => handleDelete("link_views")}
      >
        Link statistikalarını sil
      </Button>
    </div>
  );
}

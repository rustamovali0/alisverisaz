"use client";

import { useTransition } from "react";
import { Archive } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { deleteAllOrdersAction, deleteOrderAction } from "@/lib/orders/actions";

type EarningsItem = {
  id: string;
  title: string;
  description?: string;
  value?: string;
};

type EarningsListProps = {
  items: EarningsItem[];
  emptyTitle: string;
  emptyDescription: string;
};

export function EarningsList({
  items,
  emptyTitle,
  emptyDescription,
}: EarningsListProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function archiveItem(orderId: string) {
    startTransition(async () => {
      const confirmed = await appAlert.confirm({
        title: "Dövriyyə qeydi arxivlənsin?",
        message: "Bu sifariş hard delete edilmədən arxiv statusuna keçiriləcək.",
        confirmText: "Arxivlə",
        cancelText: "Bağla",
        variant: "default",
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      const formData = new FormData();
      formData.set("orderId", orderId);
      const result = await deleteOrderAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Qeyd arxivlənmədi");
        return;
      }

      void appAlert.success("Qeyd arxivləndi", result.message);
      router.refresh();
    });
  }

  function archiveAllItems() {
    startTransition(async () => {
      const confirmed = await appAlert.confirm({
        title: "Bütün dövriyyə qeydləri arxivlənsin?",
        message: "Sizə bağlı bütün sifarişlər arxiv statusuna keçiriləcək.",
        confirmText: "Hamısını arxivlə",
        cancelText: "Bağla",
        variant: "default",
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      const result = await deleteAllOrdersAction();

      if (!result.ok) {
        void appAlert.error(result.message, "Qeydlər arxivlənmədi");
        return;
      }

      void appAlert.success("Qeydlər arxivləndi", result.message);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        className="min-h-48"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={archiveAllItems}
        >
          <Archive className="mr-2 size-4" aria-hidden="true" />
          Hamısını arxivlə
        </Button>
      </div>
      <div className="divide-y rounded-lg border bg-background">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              {item.description ? (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {item.value ? (
                <p className="shrink-0 text-sm font-medium text-muted-foreground">
                  {item.value}
                </p>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => archiveItem(item.id)}
              >
                <Archive className="mr-2 size-4" aria-hidden="true" />
                Arxivlə
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

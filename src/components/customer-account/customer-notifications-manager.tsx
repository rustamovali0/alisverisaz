"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  deleteAllNotificationsAction,
  markAllNotificationsReadAction,
} from "@/lib/notifications/actions";
import type { CustomerNotificationPreview } from "@/lib/customer-account/data";
import { cn } from "@/lib/utils";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function CustomerNotificationsManager({
  notifications,
  emptyText,
}: {
  notifications: CustomerNotificationPreview[];
  emptyText: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [isPending, startTransition] = useTransition();
  const unreadCount = items.filter((item) => !item.readAt).length;

  function markAllRead() {
    if (unreadCount === 0) {
      return;
    }

    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        void appAlert.error(result.message, "Bildirişlər yenilənmədi");
        return;
      }

      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      void appAlert.success("Bildirişlər oxundu", result.message);
      router.refresh();
    });
  }

  async function deleteAll() {
    if (items.length === 0) {
      return;
    }

    const confirmed = await appAlert.confirm({
      title: "Bildirişlər silinsin?",
      message: "Bütün bildirişlər hesabınızdan silinəcək.",
      confirmText: "Sil",
      variant: "danger",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAllNotificationsAction();
      if (!result.ok) {
        void appAlert.error(result.message, "Bildirişlər silinmədi");
        return;
      }

      setItems([]);
      void appAlert.success("Bildirişlər silindi", result.message);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isPending || unreadCount === 0} onClick={markAllRead}>
          <CheckCircle2 className="mr-2 size-4" aria-hidden="true" />
          Oxunmuş et
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={isPending || items.length === 0} onClick={deleteAll}>
          <Trash2 className="mr-2 size-4" aria-hidden="true" />
          Hamısını sil
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <div className="grid gap-2">
          {items.map((notification) => (
            <article key={notification.id} className={cn("rounded-lg border p-3", notification.readAt ? "bg-background" : "bg-primary/5")}>
              <p className="text-sm font-bold">{notification.title}</p>
              {notification.body ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.body}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(notification.createdAt)}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

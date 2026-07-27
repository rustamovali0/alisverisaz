"use client";

import { useState, useTransition } from "react";
import { PackageSearch, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  deleteAllProductMessagesAction,
  deleteProductMessageAction,
  replyProductMessageAction,
  updateProductMessageStatusAction,
} from "@/lib/messages/actions";
import type { ProductMessage } from "@/lib/messages/data";

type ProductMessageListProps = {
  messages: ProductMessage[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ProductMessageList({ messages }: ProductMessageListProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const router = useRouter();

  function updateStatus(messageId: string, status: string) {
    const formData = new FormData();
    formData.set("messageId", messageId);
    formData.set("status", status);

    startTransition(async () => {
      setPendingId(messageId);
      const result = await updateProductMessageStatusAction(formData);
      setPendingId(null);

      if (!result.ok) {
        void appAlert.error(result.message, "Mesaj yenilənmədi");
        return;
      }

      void appAlert.success("Mesaj yeniləndi", result.message);
      router.refresh();
    });
  }

  function replyToMessage(formData: FormData) {
    const messageId = String(formData.get("messageId") ?? "");

    startTransition(async () => {
      setPendingId(messageId);
      const result = await replyProductMessageAction(formData);
      setPendingId(null);

      if (!result.ok) {
        void appAlert.error(result.message, "Cavab göndərilmədi");
        return;
      }

      void appAlert.success("Cavab göndərildi", result.message);
      router.refresh();
    });
  }

  function deleteMessage(messageId: string) {
    startTransition(async () => {
      const confirmed = await appAlert.confirm({
        title: "Mesaj silinsin?",
        message: "Bu mesaj və cavabı paneldən silinəcək.",
        confirmText: "Sil",
        cancelText: "Bağla",
        variant: "danger",
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      setPendingId(messageId);
      const formData = new FormData();
      formData.set("messageId", messageId);
      const result = await deleteProductMessageAction(formData);
      setPendingId(null);

      if (!result.ok) {
        void appAlert.error(result.message, "Mesaj silinmədi");
        return;
      }

      void appAlert.success("Mesaj silindi", result.message);
      router.refresh();
    });
  }

  function deleteAllMessages() {
    startTransition(async () => {
      const confirmed = await appAlert.confirm({
        title: "Bütün mesajlar silinsin?",
        message: "Sizə bağlı bütün mesaj qeydləri silinəcək.",
        confirmText: "Hamısını sil",
        cancelText: "Bağla",
        variant: "danger",
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      setPendingId("all");
      const result = await deleteAllProductMessagesAction();
      setPendingId(null);

      if (!result.ok) {
        void appAlert.error(result.message, "Mesajlar silinmədi");
        return;
      }

      void appAlert.success("Mesajlar silindi", result.message);
      router.refresh();
    });
  }

  if (messages.length === 0) {
    return (
      <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        Hələ mesaj yoxdur.
      </p>
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
          disabled={isPending && pendingId === "all"}
          onClick={deleteAllMessages}
        >
          <Trash2 className="mr-2 size-4" aria-hidden="true" />
          Hamısını sil
        </Button>
      </div>
      {messages.map((item) => (
        <article key={item.id} className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                {item.productImageUrl ? (
                  <img
                    src={item.productImageUrl}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PackageSearch className="size-8 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{item.storeName}</p>
                <h3 className="mt-1 truncate text-base font-black tracking-normal">
                  {item.productName}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.senderName}
                  {item.senderPhone ? ` · ${item.senderPhone}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground lg:items-end">
              <span>{formatDate(item.createdAt)} · {item.status}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={isPending && pendingId === item.id}
                onClick={() => deleteMessage(item.id)}
              >
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                Sil
              </Button>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="max-w-3xl rounded-lg bg-card p-3 text-sm leading-6">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                Müştəri mesajı
              </p>
              {item.message}
            </div>
            {item.replyMessage ? (
              <div className="ml-auto max-w-3xl rounded-lg bg-primary p-3 text-sm leading-6 text-primary-foreground">
                <p className="mb-1 text-xs font-semibold text-primary-foreground/75">
                  Cavab
                  {item.replyAt
                    ? ` · ${formatDate(item.replyAt)}`
                    : ""}
                </p>
                {item.replyMessage}
              </div>
            ) : null}
          </div>
          <form action={replyToMessage} className="mt-3 grid gap-2">
            <input type="hidden" name="messageId" value={item.id} />
            <textarea
              className="premium-input min-h-20 resize-y py-3 text-sm"
              name="replyMessage"
              defaultValue={item.replyMessage ?? ""}
              placeholder="Cavab yazın"
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={isPending && pendingId === item.id}
              >
                {isPending && pendingId === item.id ? "Göndərilir" : "Cavab ver"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  (isPending && pendingId === item.id) || item.status === "read"
                }
                onClick={() => updateStatus(item.id, "read")}
              >
                Oxundu
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  (isPending && pendingId === item.id) || item.status === "archived"
                }
                onClick={() => updateStatus(item.id, "archived")}
              >
                Arxivlə
              </Button>
            </div>
          </form>
        </article>
      ))}
    </div>
  );
}

"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/swal";
import { updateProductMessageStatusAction } from "@/lib/messages/actions";
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

  function updateStatus(messageId: string, status: string) {
    const formData = new FormData();
    formData.set("messageId", messageId);
    formData.set("status", status);

    startTransition(async () => {
      const result = await updateProductMessageStatusAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Mesaj yenilənmədi");
        return;
      }

      await appAlert.success("Mesaj yeniləndi", result.message);
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
      {messages.map((item) => (
        <article key={item.id} className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">{item.storeName}</p>
              <h3 className="mt-1 text-base font-black tracking-normal">
                {item.productName}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.senderName}
                {item.senderPhone ? ` · ${item.senderPhone}` : ""}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(item.createdAt)} · {item.status}
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-card p-3 text-sm leading-6">
            {item.message}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending || item.status === "read"}
              onClick={() => updateStatus(item.id, "read")}
            >
              Oxundu
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending || item.status === "archived"}
              onClick={() => updateStatus(item.id, "archived")}
            >
              Arxivlə
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

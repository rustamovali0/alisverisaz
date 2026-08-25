"use client";

import { Loader2, MessageCircle, Send, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { replyProductMessageAction } from "@/lib/messages/actions";
import type { ProductMessage } from "@/lib/messages/data";
import type { ProductReview } from "@/lib/reviews/data";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("az-AZ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("az-AZ");
}

function ProductMessageReplyForm({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("messageId", messageId);

    startTransition(async () => {
      const result = await replyProductMessageAction(formData);
      if (!result.ok) {
        void appAlert.error(result.message, "Cavab göndərilmədi");
        return;
      }

      form.reset();
      void appAlert.success("Cavab göndərildi", result.message);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-2 border-t pt-3">
      <label className="sr-only" htmlFor={`reply-${messageId}`}>Cavabınız</label>
      <textarea
        id={`reply-${messageId}`}
        name="replyMessage"
        required
        maxLength={2000}
        rows={3}
        className="premium-input min-h-20 resize-y text-sm"
        placeholder="Cavabınızı yazın"
      />
      <Button type="submit" size="sm" disabled={isPending} className="w-full sm:w-fit">
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
        Cavab göndər
      </Button>
    </form>
  );
}

export function ProductMessageThread({
  messages,
  allowReplies = false,
}: {
  messages: ProductMessage[];
  allowReplies?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const orderedMessages = [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const visibleMessages = showAll ? orderedMessages : orderedMessages.slice(0, 1);

  if (messages.length === 0) {
    return (
      <p className="mt-4 rounded-lg border bg-background p-2.5 text-sm text-muted-foreground md:mt-6 md:p-3">
        Mesaj tarixçəniz yoxdur.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2 md:mt-6 md:space-y-3">
      {visibleMessages.map((item) => (
        <article
          key={item.id}
          className="min-w-0 space-y-2 rounded-lg border bg-background p-2.5 md:space-y-3 md:p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold md:text-base">{item.senderName}</p>
            <span className="text-[11px] text-muted-foreground md:text-xs">
              {formatDateTime(item.createdAt)}
            </span>
          </div>
          <div className="break-words rounded-lg bg-card p-2.5 text-sm leading-5 text-muted-foreground md:p-3 md:leading-6">
            {item.message}
          </div>
          {item.replyMessage ? (
            <div className="ml-auto break-words rounded-lg bg-primary p-2.5 text-sm leading-5 text-primary-foreground sm:max-w-[85%] md:p-3 md:leading-6">
              <p className="mb-1 text-xs font-semibold text-primary-foreground/75">
                Satıcının cavabı
                {item.replyAt ? ` · ${formatDateTime(item.replyAt)}` : ""}
              </p>
              {item.replyMessage}
            </div>
          ) : allowReplies ? (
            <ProductMessageReplyForm messageId={item.id} />
          ) : (
            <div className="inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground md:px-3 md:py-2">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              Satıcı cavabı gözlənilir.
            </div>
          )}
        </article>
      ))}
      {messages.length > 1 ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Az göstər" : `Ətraflı (${messages.length - 1})`}
        </Button>
      ) : null}
    </div>
  );
}

export function ProductReviewList({ reviews }: { reviews: ProductReview[] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleReviews = showAll ? reviews : reviews.slice(0, 3);

  if (reviews.length === 0) {
    return (
      <p className="mt-6 rounded-lg border bg-background p-3 text-sm text-muted-foreground">
        Bu məhsula hələ rəy yazılmayıb.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {visibleReviews.map((review) => (
        <article key={review.id} className="min-w-0 rounded-lg border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{review.userName}</p>
              <div className="mt-1 flex">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={
                      value <= review.rating
                        ? "size-4 fill-amber-400 text-amber-400"
                        : "size-4 text-muted-foreground"
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDate(review.createdAt)}
            </span>
          </div>
          {review.comment ? (
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              {review.comment}
            </p>
          ) : null}
        </article>
      ))}
      {reviews.length > 3 ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Az göstər" : `Bütün rəyləri oxu (${reviews.length})`}
        </Button>
      ) : null}
    </div>
  );
}

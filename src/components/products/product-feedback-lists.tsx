"use client";

import { MessageCircle, Star } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProductMessage } from "@/lib/messages/data";
import type { ProductReview } from "@/lib/reviews/data";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("az-AZ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("az-AZ");
}

export function ProductMessageThread({ messages }: { messages: ProductMessage[] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleMessages = showAll ? messages : messages.slice(-3);

  if (messages.length === 0) {
    return (
      <p className="mt-6 rounded-lg border bg-background p-3 text-sm text-muted-foreground">
        Mesaj tarixçəniz yoxdur.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {visibleMessages.map((item) => (
        <article
          key={item.id}
          className="min-w-0 space-y-3 rounded-lg border bg-background p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{item.senderName}</p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDateTime(item.createdAt)}
            </span>
          </div>
          <div className="break-words rounded-lg bg-card p-3 text-sm leading-6 text-muted-foreground">
            {item.message}
          </div>
          {item.replyMessage ? (
            <div className="ml-auto break-words rounded-lg bg-primary p-3 text-sm leading-6 text-primary-foreground sm:max-w-[85%]">
              <p className="mb-1 text-xs font-semibold text-primary-foreground/75">
                Satıcının cavabı
                {item.replyAt ? ` · ${formatDateTime(item.replyAt)}` : ""}
              </p>
              {item.replyMessage}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              Satıcı cavabı gözlənilir.
            </div>
          )}
        </article>
      ))}
      {messages.length > 3 ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Az göstər" : `Ətraflı (${messages.length - 3})`}
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

import { Star } from "lucide-react";

import type { ProductReview } from "@/lib/reviews/data";

type AdminReviewListProps = {
  reviews: ProductReview[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className="size-4"
          fill={index < rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

export function AdminReviewList({ reviews }: AdminReviewListProps) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        Hələ məhsul rəyi yoxdur.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <article key={review.id} className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">{review.storeName}</p>
              <h3 className="mt-1 text-base font-black tracking-normal">
                {review.productName}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {review.userName} · {review.status}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground lg:items-end">
              <RatingStars rating={review.rating} />
              <span>{formatDate(review.createdAt)}</span>
            </div>
          </div>
          {review.comment ? (
            <div className="mt-4 rounded-lg bg-card p-3 text-sm leading-6">
              {review.comment}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

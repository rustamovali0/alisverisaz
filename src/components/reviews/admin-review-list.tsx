"use client";

import { Archive, Pencil, Save, Star, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  archiveAdminProductReviewAction,
  deleteAdminProductReviewAction,
  updateAdminProductReviewAction,
} from "@/lib/reviews/actions";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateReview(formData: FormData) {
    startTransition(async () => {
      const result = await updateAdminProductReviewAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Rəy yenilənmədi");
        return;
      }

      setEditingId(null);
      void appAlert.success("Rəy yeniləndi", result.message);
    });
  }

  async function archiveReview(review: ProductReview) {
    const confirmed = await appAlert.confirm({
      title: "Rəy arxivlənsin?",
      message: `${review.productName} məhsulundakı rəy arxivə köçürüləcək.`,
      confirmText: "Arxivlə",
      cancelText: "Ləğv et",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    startTransition(async () => {
      const result = await archiveAdminProductReviewAction(review.id);

      if (!result.ok) {
        void appAlert.error(result.message, "Rəy arxivlənmədi");
        return;
      }

      void appAlert.success("Rəy arxivləndi", result.message);
    });
  }

  async function deleteReview(review: ProductReview) {
    const confirmed = await appAlert.confirm({
      title: "Rəy silinsin?",
      message: `${review.productName} məhsulundakı rəy tam silinəcək.`,
      confirmText: "Sil",
      cancelText: "Ləğv et",
      variant: "danger",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAdminProductReviewAction(review.id);

      if (!result.ok) {
        void appAlert.error(result.message, "Rəy silinmədi");
        return;
      }

      void appAlert.success("Rəy silindi", result.message);
    });
  }

  if (reviews.length === 0) {
    return (
      <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        Hələ məhsul rəyi yoxdur.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const isEditing = editingId === review.id;

        return (
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
            {isEditing ? (
              <form action={updateReview} className="mt-4 grid gap-3 rounded-lg bg-card p-3">
                <input type="hidden" name="reviewId" value={review.id} />
                <div className="grid gap-3 sm:grid-cols-[120px_160px_minmax(0,1fr)]">
                  <label className="grid gap-1 text-sm font-semibold">
                    Reytinq
                    <select
                      name="rating"
                      defaultValue={review.rating}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Status
                    <select
                      name="status"
                      defaultValue={review.status}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="approved">approved</option>
                      <option value="pending">pending</option>
                      <option value="rejected">rejected</option>
                      <option value="archived">archived</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Rəy
                    <textarea
                      name="comment"
                      defaultValue={review.comment ?? ""}
                      rows={3}
                      className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" disabled={isPending}>
                    <Save className="mr-2 size-4" aria-hidden="true" />
                    Saxla
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="mr-2 size-4" aria-hidden="true" />
                    Ləğv et
                  </Button>
                </div>
              </form>
            ) : review.comment ? (
              <div className="mt-4 rounded-lg bg-card p-3 text-sm leading-6">
                {review.comment}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingId(review.id)}
              >
                <Pencil className="mr-2 size-4" aria-hidden="true" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void archiveReview(review)}
                disabled={isPending || review.status === "archived"}
              >
                <Archive className="mr-2 size-4" aria-hidden="true" />
                Arxivlə
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void deleteReview(review)}
                disabled={isPending}
              >
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                Sil
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

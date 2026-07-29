"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import type { AuthRole } from "@/lib/auth/types";
import { upsertProductReviewAction } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

type ProductReviewFormProps = {
  productId: string;
  storeSlug: string;
  viewerRole?: AuthRole | null;
};

export function ProductReviewForm({
  productId,
  storeSlug,
  viewerRole,
}: ProductReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (viewerRole !== "customer") {
      void appAlert.info(
        "İstifadəçi hesabı lazımdır",
        "Rəy yazmaq üçün zəhmət olmasa istifadəçi hesabı ilə giriş edin.",
      );
      return;
    }

    startTransition(async () => {
      const result = await upsertProductReviewAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Rəy saxlanmadı");
        return;
      }

      void appAlert.success("Rəy saxlandı", result.message);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className="rounded-md p-1 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setRating(value)}
            onKeyDown={(event) => {
              if (event.key >= "1" && event.key <= "5") {
                setRating(Number(event.key));
              }
            }}
            aria-label={`${value} ulduz`}
            aria-pressed={value <= rating}
          >
            <Star
              className={cn(
                "size-7",
                value <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Şərh
        <textarea
          className="premium-input min-h-24 resize-y py-3"
          name="comment"
          placeholder="Məhsul haqqında fikrinizi yazın"
        />
      </label>
      <Button type="submit" disabled={isPending || rating === 0} className="w-fit">
        {isPending ? "Saxlanılır" : "Dəyərləndirmə yaz"}
      </Button>
    </form>
  );
}

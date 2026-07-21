"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/swal";
import { upsertProductReviewAction } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

type ProductReviewFormProps = {
  productId: string;
  storeSlug: string;
};

export function ProductReviewForm({ productId, storeSlug }: ProductReviewFormProps) {
  const [rating, setRating] = useState(1);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await upsertProductReviewAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Rəy saxlanmadı");
        return;
      }

      await appAlert.success("Rəy saxlandı", result.message);
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
            className="rounded-md p-1 transition hover:scale-105"
            onClick={() => setRating(value)}
            aria-label={`${value} ulduz`}
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
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saxlanılır" : "Dəyərləndirmə yaz"}
      </Button>
    </form>
  );
}

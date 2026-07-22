"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { updatePlanAction } from "@/lib/subscriptions/actions";
import type { SubscriptionPlan } from "@/lib/subscriptions/types";

type AdminPlanFormProps = {
  plan: SubscriptionPlan;
};

export function AdminPlanForm({ plan }: AdminPlanFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePlanAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Plan yenilənmədi");
        return;
      }

      void appAlert.success("Plan yeniləndi", result.message);
    });
  }

  return (
    <form
      action={handleSubmit}
      className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm"
    >
      <input type="hidden" name="planId" value={plan.id} />
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor={`name-${plan.id}`}>
          Plan adı
        </label>
        <input
          id={`name-${plan.id}`}
          name="name"
          defaultValue={plan.name}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor={`description-${plan.id}`}>
          Təsvir
        </label>
        <textarea
          id={`description-${plan.id}`}
          name="description"
          defaultValue={plan.description ?? ""}
          className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`price-${plan.id}`}>
            Qiymət, AZN / ay
          </label>
          <input
            id={`price-${plan.id}`}
            name="priceAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={plan.priceAmount}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`limit-${plan.id}`}>
            Elan limiti
          </label>
          <input
            id={`limit-${plan.id}`}
            name="listingLimit"
            type="number"
            min="0"
            step="1"
            defaultValue={plan.listingLimit}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={plan.isActive}
          className="size-4 rounded border-input"
        />
        Aktiv plan
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Yenilənir" : "Planı yadda saxla"}
      </Button>
    </form>
  );
}

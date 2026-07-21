"use client";

import { CheckCircle2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/swal";
import { activatePlanPlaceholderAction } from "@/lib/subscriptions/actions";
import type { SubscriptionPlan } from "@/lib/subscriptions/types";

type PlanActivationFormProps = {
  plan: SubscriptionPlan;
  storeId: string;
  isCurrent?: boolean;
};

export function PlanActivationForm({
  plan,
  storeId,
  isCurrent = false,
}: PlanActivationFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await activatePlanPlaceholderAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Abunəlik aktiv olmadı");
        return;
      }

      await appAlert.success("Abunəlik aktivdir", result.message);
    });
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="planId" value={plan.id} />
      <Button
        type="submit"
        className="w-full"
        variant={isCurrent ? "secondary" : "default"}
        disabled={isPending || isCurrent}
      >
        {isCurrent ? (
          <>
            <CheckCircle2 className="mr-2 size-4" aria-hidden="true" />
            Aktiv plan
          </>
        ) : isPending ? (
          "Aktiv edilir"
        ) : (
          "Placeholder aktiv et"
        )}
      </Button>
    </form>
  );
}

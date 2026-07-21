"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/swal";
import { updateDepositSettingsAction } from "@/lib/settings/actions";

type DepositSettingsFormProps = {
  enabled: boolean;
};

export function DepositSettingsForm({ enabled }: DepositSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateDepositSettingsAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Ayar yenilənmədi");
        return;
      }

      await appAlert.success("Ayar yeniləndi", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="rounded-md border bg-card p-4 shadow-sm">
      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={enabled}
          className="size-4 rounded border-input"
        />
        Beh sistemi aktivdir
      </label>
      <p className="mt-2 text-sm text-muted-foreground">
        Deaktiv olduqda məhsulda beh aktiv olsa belə istifadəçi beh göndərə bilməz.
      </p>
      <Button type="submit" className="mt-4" disabled={isPending}>
        {isPending ? "Yadda saxlanılır" : "Yadda saxla"}
      </Button>
    </form>
  );
}

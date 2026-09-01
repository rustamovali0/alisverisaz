"use client";

import { KeyRound, Save } from "lucide-react";
import { useState, useTransition } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { updatePasswordAction } from "@/lib/auth/actions";

export function PasswordChangeForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePasswordAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Şifrə yenilənmədi");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      void appAlert.success("Şifrə yeniləndi", result.message);
    });
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card">
      <div className="mb-4 flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">Şifrəni dəyişdir</h2>
        </div>
      </div>
      <form
        action={handleSubmit}
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
      >
        <PasswordInput
          id="dashboard-new-password"
          name="password"
          label="Yeni şifrə"
          value={password}
          onValueChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <PasswordInput
          id="dashboard-confirm-password"
          name="confirmPassword"
          label="Şifrənin təkrarı"
          value={confirmPassword}
          onValueChange={setConfirmPassword}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Button
          type="submit"
          className="h-10 rounded-[10px] bg-blue-600 px-4 font-semibold text-white shadow-none hover:bg-blue-700"
          disabled={isPending}
        >
          <Save className="mr-2 size-4" aria-hidden="true" />
          {isPending ? "Yenilənir" : "Yenilə"}
        </Button>
      </form>
    </div>
  );
}

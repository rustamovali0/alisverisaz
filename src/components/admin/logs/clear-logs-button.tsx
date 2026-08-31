"use client";

import { useState, useTransition } from "react";
import { LockKeyhole, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  clearAdminAuditLogsAction,
  clearUserActivityLogsAction,
} from "@/lib/activity/actions";

type ClearLogsButtonProps = {
  scope: "audit" | "activity";
};

export function ClearLogsButton({ scope }: ClearLogsButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const title = scope === "audit" ? "Audit logları silinsin?" : "Fəaliyyət logları silinsin?";
  const description =
    scope === "audit"
      ? "Bütün radmin audit logları silinəcək. Davam etmək üçün admin şifrəsini yazın."
      : "Bütün istifadəçi və satıcı fəaliyyət logları silinəcək. Davam etmək üçün admin şifrəsini yazın.";

  function closeModal() {
    if (isPending) {
      return;
    }

    setOpen(false);
    setPassword("");
  }

  function submit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("password", password);

      const result =
        scope === "audit"
          ? await clearAdminAuditLogsAction(formData)
          : await clearUserActivityLogsAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Loglar silinmədi");
        return;
      }

      setOpen(false);
      setPassword("");
      void appAlert.success("Loglar silindi", result.message);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="mr-2 size-4" aria-hidden="true" />
        Logları təmizlə
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={title}>
          <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
                    <LockKeyhole className="size-5" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-black">{title}</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background text-muted-foreground hover:bg-accent"
                onClick={closeModal}
                aria-label="Bağla"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <form
              className="grid gap-4 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <label className="grid gap-2 text-sm font-semibold">
                Admin şifrəsi
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoFocus
                  required
                />
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isPending}>
                  Ləğv et
                </Button>
                <Button type="submit" variant="destructive" disabled={isPending || password.length === 0}>
                  {isPending ? "Silinir" : "Təsdiqlə və sil"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

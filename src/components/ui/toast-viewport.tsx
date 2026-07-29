"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppToast = {
  id: string;
  title: string;
  description?: string;
  variant?: "success" | "error" | "warning" | "info";
};

type ToastEvent = CustomEvent<Omit<AppToast, "id">>;

export function ToastViewport() {
  const [toasts, setToasts] = useState<AppToast[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as ToastEvent).detail;
      const id = crypto.randomUUID();

      setToasts((current) => [...current, { id, ...detail }].slice(-3));
      const timeout = detail.variant === "error" ? 7000 : detail.variant === "warning" ? 5600 : 3800;

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, timeout);
    }

    window.addEventListener("alisveris-toast", handleToast);

    return () => window.removeEventListener("alisveris-toast", handleToast);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed left-3 right-3 top-4 z-[80] grid max-w-full gap-2 md:left-auto md:right-4 md:w-full md:max-w-[360px]"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.variant === "success"
            ? CheckCircle2
            : toast.variant === "error"
              ? XCircle
              : toast.variant === "warning"
                ? AlertTriangle
                : Info;

        return (
        <div
          key={toast.id}
          className="flex min-w-0 items-start gap-3 rounded-lg border bg-card/95 p-3 text-card-foreground shadow-xl shadow-slate-900/12 backdrop-blur"
          role={toast.variant === "error" ? "alert" : "status"}
        >
          <span
            className={cn(
              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md",
              toast.variant === "success" && "bg-emerald-500/10 text-emerald-600",
              toast.variant === "error" && "bg-destructive/10 text-destructive",
              toast.variant === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              (!toast.variant || toast.variant === "info") && "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-bold">{toast.title}</p>
            {toast.description ? (
              <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                {toast.description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            onClick={() =>
              setToasts((current) => current.filter((item) => item.id !== toast.id))
            }
            aria-label="Bildirişi bağla"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        );
      })}
    </div>
  );
}

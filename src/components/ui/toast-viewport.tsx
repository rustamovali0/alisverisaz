"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type AppToast = {
  id: string;
  title: string;
  description?: string;
  variant?: "success" | "error" | "warning" | "info";
  dedupeKey?: string;
};

type ToastEvent = CustomEvent<Omit<AppToast, "id">>;
const PENDING_TOASTS_KEY = "alisveris-pending-toasts";

export function ToastViewport() {
  const [toasts, setToasts] = useState<AppToast[]>([]);

  useEffect(() => {
    function addToast(detail: ToastEvent["detail"]) {
      const id = crypto.randomUUID();
      const dedupeKey =
        detail.dedupeKey ??
        `${detail.variant ?? "info"}:${detail.title}:${detail.description ?? ""}`;

      setToasts((current) => {
        if (
          current.some(
            (toast) =>
              (toast.dedupeKey ??
                `${toast.variant ?? "info"}:${toast.title}:${toast.description ?? ""}`) ===
              dedupeKey,
          )
        ) {
          return current;
        }

        return [...current, { id, ...detail, dedupeKey }].slice(-3);
      });
      const timeout = detail.variant === "error" ? 7000 : detail.variant === "warning" ? 5600 : 3800;

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, timeout);
    }

    function handleToast(event: Event) {
      addToast((event as ToastEvent).detail);
    }

    try {
      const pending = window.sessionStorage.getItem(PENDING_TOASTS_KEY);

      if (pending) {
        window.sessionStorage.removeItem(PENDING_TOASTS_KEY);
        const parsed = JSON.parse(pending) as Array<ToastEvent["detail"]>;
        parsed.forEach(addToast);
      }
    } catch {
      window.sessionStorage.removeItem(PENDING_TOASTS_KEY);
    }

    window.addEventListener("alisveris-toast", handleToast);

    return () => window.removeEventListener("alisveris-toast", handleToast);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed left-3 right-3 top-4 z-[80] grid max-w-full gap-2 md:left-auto md:right-4 md:w-full md:max-w-[380px]"
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
            className={cn(
              "relative flex min-w-0 animate-[toast-slide-in_180ms_ease-out] items-center gap-3 overflow-hidden rounded-xl border border-border/80 bg-white px-4 py-3 text-slate-950 shadow-xl shadow-slate-900/12 dark:bg-card dark:text-card-foreground motion-reduce:animate-none",
              toast.variant === "success" && "border-[hsl(var(--toast-success)/0.2)]",
              toast.variant === "error" && "border-[hsl(var(--toast-error)/0.2)]",
              toast.variant === "warning" && "border-[hsl(var(--toast-warning)/0.2)]",
              (!toast.variant || toast.variant === "info") && "border-[hsl(var(--toast-info)/0.2)]",
            )}
            role={toast.variant === "error" ? "alert" : "status"}
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-1.5",
                toast.variant === "success" && "bg-[hsl(var(--toast-success))]",
                toast.variant === "error" && "bg-[hsl(var(--toast-error))]",
                toast.variant === "warning" && "bg-[hsl(var(--toast-warning))]",
                (!toast.variant || toast.variant === "info") && "bg-[hsl(var(--toast-info))]",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "ml-1 grid size-9 shrink-0 place-items-center rounded-full text-white",
                toast.variant === "success" && "bg-[hsl(var(--toast-success))]",
                toast.variant === "error" && "bg-[hsl(var(--toast-error))]",
                toast.variant === "warning" && "bg-[hsl(var(--toast-warning))]",
                (!toast.variant || toast.variant === "info") && "bg-[hsl(var(--toast-info))]",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-extrabold tracking-normal">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">
                  {toast.description}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

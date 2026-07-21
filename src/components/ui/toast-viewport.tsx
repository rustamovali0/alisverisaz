"use client";

import { CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppToast = {
  id: string;
  title: string;
  description?: string;
  variant?: "success" | "info";
};

type ToastEvent = CustomEvent<Omit<AppToast, "id">>;

export function ToastViewport() {
  const [toasts, setToasts] = useState<AppToast[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as ToastEvent).detail;
      const id = crypto.randomUUID();

      setToasts((current) => [...current, { id, ...detail }].slice(-3));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3800);
    }

    window.addEventListener("alisveris-toast", handleToast);

    return () => window.removeEventListener("alisveris-toast", handleToast);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[80] grid w-[min(360px,calc(100vw-2rem))] gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-lg border bg-card/95 p-3 text-card-foreground shadow-xl shadow-slate-900/12 backdrop-blur"
          role="status"
        >
          <span
            className={cn(
              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md",
              toast.variant === "success"
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-primary/10 text-primary",
            )}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="size-5" aria-hidden="true" />
            ) : (
              <Info className="size-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{toast.title}</p>
            {toast.description ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
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
      ))}
    </div>
  );
}

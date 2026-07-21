"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors/app-error";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: unknown;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Xeta bas verdi",
  description,
  actionLabel,
  onAction,
  className,
}: ErrorStateProps) {
  const message = description ? getErrorMessage(description) : undefined;

  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">
          {title}
        </h1>
        {message ? (
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        ) : null}
      </div>
      {actionLabel ? (
        <Button
          type="button"
          variant="outline"
          onClick={onAction ?? (() => window.location.assign("/"))}
        >
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}

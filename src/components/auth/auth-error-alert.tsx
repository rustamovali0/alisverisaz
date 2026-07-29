import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthErrorAlertProps = {
  title?: string;
  message?: string | null;
  className?: string;
};

export function AuthErrorAlert({
  title = "Xəta",
  message,
  className,
}: AuthErrorAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-destructive/20 bg-card px-4 py-3 text-sm text-foreground shadow-sm",
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
        <AlertCircle className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="font-semibold">{title}</p>
        <p className="break-words leading-6 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

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
        "flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive",
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        <p className="font-semibold">{title}</p>
        <p className="leading-6">{message}</p>
      </div>
    </div>
  );
}

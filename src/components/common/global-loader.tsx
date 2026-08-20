import { cn } from "@/lib/utils";

type GlobalLoaderProps = {
  className?: string;
  label?: string;
};

export function GlobalLoader({ className, label = "Yüklənir" }: GlobalLoaderProps) {
  return (
    <span className={cn("global-loader", className)} role="status" aria-live="polite">
      <span />
      <span />
      <span />
      <span />
      <span className="sr-only">{label}</span>
    </span>
  );
}

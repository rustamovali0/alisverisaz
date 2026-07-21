import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label = "Yuklenir", className }: LoadingStateProps) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 text-center",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-3">
        <Skeleton className="mx-auto h-4 w-40" />
        <Skeleton className="mx-auto h-4 w-64" />
        <Skeleton className="mx-auto h-10 w-32" />
      </div>
      <span className="sr-only">{label}</span>
    </section>
  );
}

import { cn } from "@/lib/utils";

type RouteLoadingProps = {
  variant?: "marketplace" | "dashboard" | "account";
};

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function RouteLoading({ variant = "marketplace" }: RouteLoadingProps) {
  if (variant === "account") {
    return (
      <main className="min-h-[60vh] bg-background">
        <div className="fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden bg-primary/10">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
          <SkeletonBlock className="h-9 w-32" />
          <div className="mt-6 rounded-xl border bg-card p-4">
            <SkeletonBlock className="h-16 w-full" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-12" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className="min-h-[60vh] bg-background">
        <div className="fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden bg-primary/10">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <SkeletonBlock className="h-7 w-44" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-24" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <main className="min-h-[50vh] bg-background">
      <div className="fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden bg-primary/10">
        <div className="h-full w-1/3 animate-pulse bg-primary" />
      </div>
      <div className="container py-4 md:py-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-40 sm:h-48" />
          ))}
        </div>
      </div>
    </main>
  );
}

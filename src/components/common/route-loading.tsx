import { cn } from "@/lib/utils";

type RouteLoadingProps = {
  variant?: "marketplace" | "dashboard";
};

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function RouteLoading({ variant = "marketplace" }: RouteLoadingProps) {
  if (variant === "dashboard") {
    return (
      <div className="min-h-screen bg-background soft-grid-bg">
        <div className="border-b bg-background/[0.82] px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="mt-2 h-4 w-64 max-w-full" />
        </div>
        <main className="grid gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28" />
            ))}
          </div>
          <SkeletonBlock className="h-80" />
        </main>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-muted/40">
      <header className="border-b bg-card/95">
        <div className="container flex h-16 items-center gap-3">
          <SkeletonBlock className="size-10" />
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="hidden h-11 flex-1 md:block" />
          <SkeletonBlock className="h-11 w-24" />
        </div>
      </header>
      <div className="container py-8">
        <SkeletonBlock className="h-24" />
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[240px_1fr]">
          <div className="flex gap-2 overflow-hidden lg:block lg:space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10 w-36 shrink-0" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-lg border bg-card">
                <SkeletonBlock className="h-32 rounded-none" />
                <div className="space-y-3 p-4">
                  <SkeletonBlock className="h-5 w-2/3" />
                  <SkeletonBlock className="h-4 w-1/3" />
                  <SkeletonBlock className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

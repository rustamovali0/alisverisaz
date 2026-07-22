import { cn } from "@/lib/utils";

type RouteLoadingProps = {
  variant?: "marketplace" | "dashboard" | "account";
};

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function LoadingSpinner() {
  return (
    <div
      aria-label="Səhifə yüklənir"
      role="status"
      className="size-11 animate-spin rounded-full border-4 border-muted border-t-primary"
    />
  );
}

export function RouteLoading({ variant = "marketplace" }: RouteLoadingProps) {
  if (variant === "account") {
    return (
      <main className="min-h-screen bg-muted/40">
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
          <div className="container flex h-16 items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">
              a
            </div>
            <div className="text-xl font-black tracking-normal">alisveris.az</div>
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              <SkeletonBlock className="h-10 w-24" />
              <SkeletonBlock className="size-11" />
              <SkeletonBlock className="size-11" />
            </div>
          </div>
        </header>
        <div className="container py-8">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <SkeletonBlock className="h-7 w-48" />
            <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
            <SkeletonBlock className="mt-8 h-40" />
          </div>
        </div>
      </main>
    );
  }

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
          <div className="grid size-11 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">
            a
          </div>
          <div className="text-xl font-black tracking-normal">alisveris.az</div>
          <SkeletonBlock className="hidden h-11 flex-1 md:block" />
          <SkeletonBlock className="h-11 w-24" />
        </div>
      </header>
      <div className="container flex min-h-[420px] items-center justify-center py-10">
        <div className="grid size-20 place-items-center rounded-full border bg-card shadow-sm">
          <LoadingSpinner />
        </div>
      </div>
    </main>
  );
}

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
      <main className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--muted)/0.48),hsl(var(--background))_22%)]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8">
          <section className="rounded-xl border bg-card p-5 shadow-xl shadow-slate-900/10 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <SkeletonBlock className="h-10 w-20" />
              <SkeletonBlock className="h-10 w-36" />
            </div>
            <SkeletonBlock className="h-10 w-48" />
            <SkeletonBlock className="mt-3 h-4 w-80 max-w-full" />
            <div className="mt-8 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
              </div>
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-12" />
            </div>
          </section>
          <div className="hidden overflow-hidden rounded-xl border bg-card lg:block">
            <SkeletonBlock className="h-[620px] rounded-none" />
          </div>
        </div>
      </main>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className="min-h-screen bg-background soft-grid-bg">
        <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden border-r bg-card/80 p-4 lg:block">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="size-11" />
              <SkeletonBlock className="h-6 w-36" />
            </div>
            <div className="mt-8 grid gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-11" />
              ))}
            </div>
          </aside>
          <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            <SkeletonBlock className="h-7 w-44" />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-28" />
              ))}
            </div>
            <SkeletonBlock className="mt-6 h-80" />
          </main>
        </div>
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
          <div className="text-xl font-black tracking-normal">Alışveriş</div>
          <SkeletonBlock className="hidden h-11 flex-1 md:block" />
          <SkeletonBlock className="h-11 w-24" />
        </div>
      </header>
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
          <section className="min-w-0">
            <SkeletonBlock className="h-10 w-56" />
            <SkeletonBlock className="mt-8 h-14 w-full max-w-2xl" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-44" />
              ))}
            </div>
          </section>
          <aside className="hidden min-w-0 lg:block">
            <SkeletonBlock className="h-64" />
          </aside>
        </div>
      </div>
    </main>
  );
}

import { GlobalLoader } from "@/components/common/global-loader";

type RouteLoadingProps = {
  variant?: "marketplace" | "dashboard" | "account";
};

export function RouteLoading({ variant = "marketplace" }: RouteLoadingProps) {
  const label =
    variant === "dashboard" ? "Panel açılır" : variant === "account" ? "Hesab açılır" : "Səhifə açılır";

  if (variant === "marketplace") {
    return (
      <main
        className="bg-background px-4 py-5"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">{label}</span>
        <div className="container grid gap-5">
          <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
              <div className="h-12 w-full max-w-xl animate-pulse rounded-xl bg-muted" />
              <div className="flex flex-wrap gap-2">
                <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-9 w-28 animate-pulse rounded-full bg-muted" />
                <div className="h-9 w-20 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
            <div className="hidden aspect-[4/3] animate-pulse rounded-lg bg-muted lg:block" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-lg border bg-card" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-xl border bg-card">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="grid min-h-[18dvh] place-items-center bg-transparent px-4 py-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-[160px] flex-col items-center gap-2">
        <GlobalLoader />
        <span className="sr-only">{label}</span>
      </div>
    </main>
  );
}

export function ProductDetailLoading() {
  return (
    <main className="min-h-screen bg-muted/40 px-4 py-5 md:py-8" role="status" aria-live="polite">
      <span className="sr-only">Səhifə açılır</span>
      <div className="container grid max-w-full gap-5">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-muted" />
        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="aspect-[4/3] animate-pulse bg-muted md:max-h-[460px]" />
            <div className="flex gap-2 border-t bg-background p-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="size-14 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </div>
          <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm md:p-5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-10 w-4/5 animate-pulse rounded bg-muted" />
            <div className="mt-5 h-10 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-5 h-24 animate-pulse rounded-xl bg-muted" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="h-11 animate-pulse rounded-lg bg-muted" />
              <div className="h-11 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="mt-5 h-28 animate-pulse rounded-xl bg-muted" />
          </div>
        </section>
        <div className="mx-auto h-44 w-full max-w-4xl animate-pulse rounded-lg border bg-card" />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg border bg-card" />
          <div className="h-64 animate-pulse rounded-lg border bg-card" />
        </div>
      </div>
    </main>
  );
}

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

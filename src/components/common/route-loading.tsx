type RouteLoadingProps = {
  variant?: "marketplace" | "dashboard" | "account";
};

export function RouteLoading({ variant = "marketplace" }: RouteLoadingProps) {
  const label =
    variant === "dashboard" ? "Panel açılır" : variant === "account" ? "Hesab açılır" : "Səhifə açılır";

  return (
    <main
      className="grid min-h-[35dvh] place-items-center bg-background px-4 py-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-[180px] flex-col items-center gap-3">
        <span className="h-1 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </span>
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
    </main>
  );
}

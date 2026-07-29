type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({ label = "və ya" }: AuthDividerProps) {
  return (
    <div className="flex items-center gap-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

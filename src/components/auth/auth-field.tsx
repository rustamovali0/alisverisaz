import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function AuthField({ label, hint, error, id, ...props }: AuthFieldProps) {
  return (
    <label className="grid gap-1.5 text-sm font-medium" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className="h-11 rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
        {...props}
      />
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
      {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
    </label>
  );
}

type AuthSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
};

export function AuthSelect({
  label,
  hint,
  error,
  id,
  children,
  ...props
}: AuthSelectProps) {
  return (
    <label className="grid gap-1.5 text-sm font-medium" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        className="h-11 rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
        {...props}
      >
        {children}
      </select>
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
      {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
    </label>
  );
}

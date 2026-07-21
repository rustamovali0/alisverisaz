import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function AuthField({ label, id, ...props }: AuthFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        {...props}
      />
    </label>
  );
}

type AuthSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
};

export function AuthSelect({ label, id, children, ...props }: AuthSelectProps) {
  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

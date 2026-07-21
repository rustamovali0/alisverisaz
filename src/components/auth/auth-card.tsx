import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <section className="glass-panel w-full max-w-md rounded-md p-6 text-card-foreground shadow-2xl shadow-slate-900/10">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        {footer}
      </div>
    </section>
  );
}

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  topStart?: ReactNode;
  topEnd?: ReactNode;
  className?: string;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
  topStart,
  topEnd,
  className,
}: AuthCardProps) {
  return (
    <section
      className={cn(
        "w-full rounded-2xl border-0 bg-transparent p-0 text-card-foreground dark:text-slate-100",
        className,
      )}
    >
      {(topStart || topEnd) ? (
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="min-w-0">{topStart}</div>
          <div className="shrink-0">{topEnd}</div>
        </div>
      ) : null}
      <div className="mb-7 space-y-2">
        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      {children}
      <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-muted-foreground dark:border-slate-800">
        {footer}
      </div>
    </section>
  );
}

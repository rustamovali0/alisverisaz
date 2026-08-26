import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description: string;
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
        "w-full rounded-xl border border-border/80 bg-card p-4 shadow-xl shadow-slate-900/10 sm:p-5",
        className,
      )}
    >
      {(topStart || topEnd) ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">{topStart}</div>
          <div className="shrink-0">{topEnd}</div>
        </div>
      ) : null}
      <div className="mb-4 space-y-1.5">
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-normal sm:text-[1.9rem]">
          {title}
        </h1>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {footer}
      </div>
    </section>
  );
}

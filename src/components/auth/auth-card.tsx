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
        "w-full rounded-xl border border-border/80 bg-card p-5 shadow-xl shadow-slate-900/10 sm:p-7",
        className,
      )}
    >
      {(topStart || topEnd) ? (
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">{topStart}</div>
          <div className="shrink-0">{topEnd}</div>
        </div>
      ) : null}
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-normal sm:text-[2rem]">
          {title}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        {footer}
      </div>
    </section>
  );
}
